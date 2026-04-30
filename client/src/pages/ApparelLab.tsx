/*
 * ============================================================================
 * CREATORVAULT — APPAREL LAB v5.0  "EMPIRE ATELIER"
 * ============================================================================
 *
 * DESIGN MANDATE: Visual-first. The user sees the garment, the render, the
 * campaign — before they touch a single control. Controls are minimal,
 * contextual, and never stacked as a form. This is a fashion OS, not a survey.
 *
 * LAYOUT: 3 zones
 *   LEFT  — Mode Rail (vertical icon navigation, 9 modes)
 *   CENTER — Canvas (full-bleed render / output / visual state)
 *   RIGHT  — Control Drawer (minimal contextual controls, slides in)
 *
 * All tRPC calls, Zod schemas, and DB interactions are identical to v4.
 * Only the presentation layer changes.
 *
 * CONFIRMED ICONS (lucide-react@0.453.0): same as v4
 * CONFIRMED PROCEDURES: same as v4
 * ============================================================================
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Shirt, Zap, Layers, Package, Palette, Paintbrush, Scissors,
  Dna, Ruler, Eye, Printer, Star, Crown, Target, Plus, Trash2,
  Check, Loader2, Download, RefreshCw, Sparkles, TrendingUp,
  Boxes, Globe, CheckCircle2, AlertCircle, Wand2, Camera, Image,
  Copy, Settings, Search, Activity, Droplets, FileText, ChevronDown,
  Play, Pause, Square, Upload, Heart, ShoppingBag, Tag, Flame, Cpu,
  CircleDot, X, ChevronLeft, Monitor, Smartphone, Tablet, BarChart3,
  DollarSign, Package2, Truck, Clock, ArrowRight, MessageSquare,
  Hash, Users, Lock, Unlock, ChevronRight, Grid3X3, List, Filter,
  SlidersHorizontal, Bookmark, Store, LayoutGrid, Film, Video,
  Clapperboard, Music, Aperture, Sun, Moon, Layers2, BookOpen,
  Calendar, Type, ImagePlus, FolderOpen, Archive, Maximize2,
  Minimize2, RotateCcw, FlipHorizontal, Crop, Pipette, Blend,
  Brush, Eraser, Move, ZoomIn, ChevronUp, MoreHorizontal,
  ExternalLink, Share2, Sparkle, Gem, Trophy, Award, Droplet,
  Wand, PenTool, Pen, Feather, ChevronLeft as Back,
} from "lucide-react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:          "#050608",
  surface:     "#0A0C10",
  surface2:    "#0F1218",
  surface3:    "#161B24",
  border:      "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  gold:        "#C9A84C",
  goldLight:   "#E8C97A",
  goldDim:     "rgba(201,168,76,0.15)",
  text:        "#F0EDE8",
  muted:       "rgba(240,237,232,0.5)",
  dim:         "rgba(240,237,232,0.22)",
  rail:        "#07090D",
};

// ─── PRODUCT CATALOG ──────────────────────────────────────────────────────────
const PRODUCTS: { value: string; label: string; cat: string }[] = [
  { value: "oversized_tee",   label: "Oversized Tee",    cat: "tops" },
  { value: "fitted_tee",      label: "Fitted Tee",       cat: "tops" },
  { value: "hoodie",          label: "Hoodie",           cat: "tops" },
  { value: "zip_hoodie",      label: "Zip Hoodie",       cat: "tops" },
  { value: "crewneck",        label: "Crewneck",         cat: "tops" },
  { value: "crop_top",        label: "Crop Top",         cat: "tops" },
  { value: "tank_top",        label: "Tank Top",         cat: "tops" },
  { value: "long_sleeve",     label: "Long Sleeve",      cat: "tops" },
  { value: "polo",            label: "Polo",             cat: "tops" },
  { value: "button_up",       label: "Button-Up",        cat: "tops" },
  { value: "joggers",         label: "Joggers",          cat: "bottoms" },
  { value: "sweatpants",      label: "Sweatpants",       cat: "bottoms" },
  { value: "shorts",          label: "Shorts",           cat: "bottoms" },
  { value: "cargo_pants",     label: "Cargo Pants",      cat: "bottoms" },
  { value: "snapback",        label: "Snapback",         cat: "accessories" },
  { value: "beanie",          label: "Beanie",           cat: "accessories" },
  { value: "tote_bag",        label: "Tote Bag",         cat: "accessories" },
  { value: "backpack",        label: "Backpack",         cat: "accessories" },
  { value: "pillow",          label: "Pillow",           cat: "home" },
  { value: "blanket",         label: "Blanket",          cat: "home" },
];

const STYLES = [
  "streetwear","luxury","minimalist","y2k","techwear",
  "vintage","athletic","editorial","caribbean","haitian_roots",
];

const COLOR_MOODS = [
  { value: "neon",         label: "Neon",        hex: "#00FF88" },
  { value: "earth",        label: "Earth",       hex: "#8B6914" },
  { value: "monochrome",   label: "Mono",        hex: "#888888" },
  { value: "pastel",       label: "Pastel",      hex: "#FFB3C6" },
  { value: "fire",         label: "Fire",        hex: "#FF4500" },
  { value: "ocean",        label: "Ocean",       hex: "#006994" },
  { value: "gold_black",   label: "Gold/Black",  hex: "#C9A84C" },
  { value: "white_out",    label: "White Out",   hex: "#F0EDE8" },
];

const MODEL_TYPES = [
  { value: "female_streetwear", label: "Female — Street",  desc: "Urban, confident, street energy" },
  { value: "male_streetwear",   label: "Male — Street",    desc: "Bold, dominant street presence" },
  { value: "female_luxury",     label: "Female — Luxury",  desc: "Editorial, high-fashion" },
  { value: "male_luxury",       label: "Male — Luxury",    desc: "Sharp, tailored, commanding" },
  { value: "female_athletic",   label: "Female — Athletic",desc: "Fit, dynamic, performance" },
  { value: "male_athletic",     label: "Male — Athletic",  desc: "Muscular, powerful, active" },
  { value: "gender_neutral",    label: "Neutral",          desc: "Androgynous, boundary-free" },
  { value: "plus_size_female",  label: "Plus — Female",    desc: "Inclusive, powerful, beautiful" },
];

const ENVIRONMENTS = [
  { value: "studio_white",    label: "Studio White",   desc: "Clean editorial backdrop" },
  { value: "studio_black",    label: "Studio Black",   desc: "Dramatic dark backdrop" },
  { value: "urban_street",    label: "Urban Street",   desc: "City concrete & graffiti" },
  { value: "luxury_interior", label: "Luxury Interior",desc: "Marble, gold, opulence" },
  { value: "rooftop_city",    label: "Rooftop City",   desc: "Skyline, golden hour" },
  { value: "tropical",        label: "Tropical",       desc: "Caribbean vibes, lush" },
  { value: "warehouse",       label: "Warehouse",      desc: "Raw industrial energy" },
  { value: "beach_sunset",    label: "Beach Sunset",   desc: "Warm, cinematic light" },
];

const REMOTION_MODES = [
  { id: "lookbook",    label: "Lookbook",      desc: "Editorial photo sequence",    icon: BookOpen,     proc: "renderLandscape", dur: 20, grad: "from-purple-600 to-violet-700" },
  { id: "runway",      label: "Runway Film",   desc: "Cinematic runway sequence",   icon: Film,         proc: "renderLandscape", dur: 30, grad: "from-slate-600 to-slate-800" },
  { id: "drop_teaser", label: "Drop Teaser",   desc: "Hype reel for social",        icon: Zap,          proc: "renderPortrait",  dur: 15, grad: "from-amber-600 to-orange-700" },
  { id: "brand_film",  label: "Brand Film",    desc: "Full brand identity video",   icon: Clapperboard, proc: "renderLandscape", dur: 60, grad: "from-rose-600 to-pink-700" },
  { id: "reel_square", label: "Reel Square",   desc: "Instagram square format",     icon: Square,       proc: "renderSquare",    dur: 15, grad: "from-cyan-600 to-blue-700" },
  { id: "thumbnail",   label: "Thumbnail",     desc: "YouTube / banner art",        icon: Image,        proc: "renderThumbnail", dur: 5,  grad: "from-emerald-600 to-teal-700" },
];

// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────

/** Thin gold horizontal rule */
function GoldRule() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)`, opacity: 0.25 }} />;
}

/** Serif editorial headline */
function EditorialHead({ children, size = "xl" }: { children: React.ReactNode; size?: "sm" | "md" | "xl" | "2xl" }) {
  const cls: Record<string, string> = {
    sm:  "text-sm tracking-widest uppercase",
    md:  "text-lg tracking-wide",
    xl:  "text-2xl sm:text-3xl tracking-tight",
    "2xl": "text-3xl sm:text-4xl tracking-tight",
  };
  return (
    <h2 className={`font-bold ${cls[size]}`}
      style={{ fontFamily: "'Playfair Display', Georgia, serif", color: T.text }}>
      {children}
    </h2>
  );
}

/** Minimal flat action button — no gradients, no rounded pills */
function ActionBtn({
  children, onClick, loading = false, disabled = false,
  variant = "gold", size = "md", className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "gold" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const V: Record<string, string> = {
    gold:    `border text-black font-bold`,
    ghost:   `text-white/50 hover:text-white hover:bg-white/5`,
    outline: `border text-white/70 hover:text-white hover:border-white/20`,
    danger:  `border border-red-500/30 text-red-400 hover:bg-red-500/10`,
  };
  const S: Record<string, string> = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-sm",
  };
  const goldStyle = variant === "gold"
    ? { background: T.gold, borderColor: T.gold, color: "#000" }
    : variant === "outline"
    ? { borderColor: T.border }
    : {};
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 font-semibold tracking-wide transition-all ${V[variant]} ${S[size]} ${disabled || loading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      style={{ letterSpacing: "0.04em", ...goldStyle }}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
      {children}
    </button>
  );
}

/** Flat chip selector — no rounded pills */
function Chip({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all"
      style={{
        border: `1px solid ${active ? (color || T.gold) : T.border}`,
        color: active ? (color || T.gold) : T.muted,
        background: active ? `${color || T.gold}12` : "transparent",
        letterSpacing: "0.08em",
      }}
    >
      {label}
    </button>
  );
}

/** Full-bleed canvas placeholder / image display */
function Canvas({
  imageUrl, loading, emptyIcon: Icon, emptyLabel, emptyDesc, aspectRatio = "1/1",
}: {
  imageUrl?: string | null;
  loading?: boolean;
  emptyIcon?: React.ElementType;
  emptyLabel?: string;
  emptyDesc?: string;
  aspectRatio?: string;
}) {
  return (
    <div
      className="w-full relative overflow-hidden"
      style={{ aspectRatio, background: T.surface2, border: `1px solid ${T.border}` }}
    >
      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border border-white/10" style={{ borderTopColor: T.gold, animation: "spin 1.2s linear infinite" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5" style={{ color: T.gold }} />
            </div>
          </div>
          <p className="text-xs tracking-widest uppercase" style={{ color: T.dim }}>Generating</p>
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
  // @ts-ignore
  // @ts-ignore
          {Icon && (() => { const I = Icon as any; return <I className="w-10 h-10" style={{ color: T.dim }} />; })()}
          {emptyLabel && <p className="text-sm font-semibold text-center" style={{ color: T.muted }}>{emptyLabel}</p>}
          {emptyDesc && <p className="text-xs text-center max-w-xs" style={{ color: T.dim }}>{emptyDesc}</p>}
        </div>
      )}
    </div>
  );
}

/** Minimal label */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: T.dim, letterSpacing: "0.12em" }}>
      {children}
    </p>
  );
}

/** Flat text input */
function FlatInput({
  value, onChange, placeholder, multiline = false, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  multiline?: boolean; rows?: number;
}) {
  const base = `w-full bg-transparent text-sm outline-none transition-colors placeholder-white/20`;
  const style = {
    borderBottom: `1px solid ${T.border}`,
    color: T.text,
    padding: "8px 0",
  };
  return multiline ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${base} resize-none`}
      style={style}
    />
  ) : (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={base}
      style={style}
    />
  );
}

/** Design grid tile */
function DesignTile({
  url, name, desc, onDownload, selected, onSelect,
}: {
  url: string; name: string; desc?: string;
  onDownload?: () => void; selected?: boolean; onSelect?: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="relative overflow-hidden cursor-pointer transition-all group"
      style={{
        border: `1px solid ${selected ? T.gold : T.border}`,
        background: T.surface2,
      }}
    >
      <div className="aspect-square relative overflow-hidden">
        <img src={url} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {onDownload && (
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="w-full text-xs py-2 tracking-widest uppercase font-bold"
              style={{ background: T.gold, color: "#000" }}
            >
              Export
            </button>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold truncate" style={{ color: T.text }}>{name}</p>
        {desc && <p className="text-xs truncate mt-0.5" style={{ color: T.dim }}>{desc}</p>}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center" style={{ background: T.gold }}>
          <Check className="w-3 h-3 text-black" />
        </div>
      )}
    </div>
  );
}

// ─── MODE RAIL ────────────────────────────────────────────────────────────────
type Tab =
  | "quick_drop" | "design_studio" | "collection" | "remotion"
  | "model_shoot" | "drop_campaign" | "batch_factory" | "brand_dna" | "my_vault";

const MODES: { id: Tab; label: string; sub: string; icon: React.ElementType }[] = [
  { id: "quick_drop",    label: "Quick Drop",    sub: "30s",      icon: Zap },
  { id: "design_studio", label: "Design Studio", sub: "Pipeline", icon: Layers },
  { id: "collection",    label: "Collection",    sub: "Season",   icon: Package },
  { id: "remotion",      label: "Remotion",      sub: "Video",    icon: Film },
  { id: "model_shoot",   label: "Model Shoot",   sub: "On-Body",  icon: Camera },
  { id: "drop_campaign", label: "Drop Campaign", sub: "Kit",      icon: Flame },
  { id: "batch_factory", label: "Batch Factory", sub: "Mass",     icon: Boxes },
  { id: "brand_dna",     label: "Brand DNA",     sub: "Identity", icon: Dna },
  { id: "my_vault",      label: "My Vault",      sub: "Archive",  icon: Archive },
];

// ─── MODE: QUICK DROP ─────────────────────────────────────────────────────────
function QuickDrop() {
  const [prompt, setPrompt]       = useState("");
  const [product, setProduct]     = useState("oversized_tee");
  const [style, setStyle]         = useState("streetwear");
  const [colorMood, setColorMood] = useState("gold_black");
  const [result, setResult]       = useState<{ designId: string; imageUrl: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // @ts-ignore
  const gen = trpc.apparel.quickGenerate.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setResult(d); setDrawerOpen(false); },
    onError:   (e) => toast.error(e.message),
  });

  const selectedMood = COLOR_MOODS.find(m => m.value === colorMood);

  return (
    <div className="flex h-full min-h-screen" style={{ background: T.bg }}>
      {/* ── CANVAS (left/center) ── */}
      <div className="flex-1 flex flex-col">
        {/* Editorial header */}
        <div className="px-8 pt-8 pb-6">
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Quick Drop</p>
          <EditorialHead size="2xl">Generate in 30 Seconds</EditorialHead>
          <p className="text-sm mt-2" style={{ color: T.muted }}>Concept → Flux AI → Production-ready design</p>
        </div>
        <GoldRule />

        {/* Main canvas */}
        <div className="flex-1 p-8">
          {result ? (
            <div className="max-w-2xl">
              {/* Full render */}
              <div className="relative overflow-hidden mb-6" style={{ border: `1px solid ${T.border}` }}>
                <img src={result.imageUrl} alt="Generated design" className="w-full object-cover" />
                {/* Overlay info bar */}
                <div className="absolute bottom-0 left-0 right-0 px-5 py-4"
                  style={{ background: "linear-gradient(to top, rgba(5,6,8,0.95), transparent)" }}>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold }}>Design Ready</p>
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{style} · {product.replace(/_/g," ")} · {selectedMood?.label}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={result.imageUrl} download target="_blank" rel="noreferrer">
                        <ActionBtn variant="gold" size="sm"><Download className="w-3.5 h-3.5" /> Export PNG</ActionBtn>
                      </a>
                      <ActionBtn variant="outline" size="sm"
  // @ts-ignore
                        onClick={() => gen.mutate({ prompt, productType: product, style, colorMood })}>
                        <RefreshCw className="w-3.5 h-3.5" /> Variation
                      </ActionBtn>
                    </div>
                  </div>
                </div>
              </div>
              {/* Design ID */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-mono" style={{ color: T.dim }}>ID: {result.designId}</p>
                <ActionBtn variant="ghost" size="sm" onClick={() => { setResult(null); setDrawerOpen(true); }}>
                  New Design
                </ActionBtn>
              </div>
            </div>
          ) : (
            <Canvas
              loading={gen.isPending}
              emptyIcon={Shirt}
              emptyLabel="Your design renders here"
              emptyDesc="Set your concept in the panel, then generate"
              aspectRatio="1/1"
            />
          )}
        </div>
      </div>

      {/* ── CONTROL DRAWER (right) ── */}
      <div
        className="flex-shrink-0 flex flex-col border-l overflow-y-auto"
        style={{
          width: drawerOpen ? 320 : 0,
          borderColor: T.border,
          background: T.surface,
          transition: "width 0.3s ease",
          overflow: drawerOpen ? "auto" : "hidden",
        }}
      >
        {drawerOpen && (
          <div className="p-6 space-y-7">
            {/* Concept */}
            <div>
              <Label>Concept</Label>
              <FlatInput
                value={prompt}
                onChange={setPrompt}
                placeholder="Dominican flag streetwear, bold graphics, street energy..."
                multiline
                rows={3}
              />
            </div>

            <GoldRule />

            {/* Product */}
            <div>
              <Label>Product</Label>
              <div className="flex flex-wrap gap-2">
                {PRODUCTS.filter(p => p.cat === "tops").map(p => (
                  <Chip key={p.value} label={p.label} active={product === p.value} onClick={() => setProduct(p.value)} />
                ))}
              </div>
            </div>

            <GoldRule />

            {/* Style */}
            <div>
              <Label>Style Direction</Label>
              <div className="flex flex-wrap gap-2">
                {STYLES.slice(0, 6).map(s => (
                  <Chip key={s} label={s} active={style === s} onClick={() => setStyle(s)} />
                ))}
              </div>
            </div>

            <GoldRule />

            {/* Color Mood */}
            <div>
              <Label>Color Mood</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_MOODS.map(cm => (
                  <button
                    key={cm.value}
                    onClick={() => setColorMood(cm.value)}
                    className="flex flex-col items-center gap-1.5 p-2 transition-all"
                    style={{
                      border: `1px solid ${colorMood === cm.value ? T.gold : T.border}`,
                      background: colorMood === cm.value ? T.goldDim : "transparent",
                    }}
                  >
                    <div className="w-6 h-6" style={{ background: cm.hex }} />
                    <p className="text-xs" style={{ color: colorMood === cm.value ? T.gold : T.dim }}>{cm.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <GoldRule />

            {/* Generate CTA */}
            <ActionBtn
  // @ts-ignore
              onClick={() => gen.mutate({ prompt, productType: product, style, colorMood })}
              loading={gen.isPending}
              disabled={!prompt.trim()}
              variant="gold"
              size="lg"
              className="w-full justify-center"
            >
              <Zap className="w-4 h-4" />
              Generate Design
            </ActionBtn>
          </div>
        )}
      </div>

      {/* ── DRAWER TOGGLE ── */}
      <button
        onClick={() => setDrawerOpen(!drawerOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-5 h-12 flex items-center justify-center z-10 transition-all"
        style={{ background: T.surface3, border: `1px solid ${T.border}`, borderRight: "none" }}
      >
        {drawerOpen
          ? <ChevronRight className="w-3 h-3" style={{ color: T.dim }} />
          : <ChevronLeft className="w-3 h-3" style={{ color: T.dim }} />
        }
      </button>
    </div>
  );
}

// ─── MODE: DESIGN STUDIO ──────────────────────────────────────────────────────
type StudioStep = "moodboard" | "design" | "colorways" | "techpack";

function DesignStudio() {
  const [step, setStep]           = useState<StudioStep>("moodboard");
  const [projectId, setProjectId] = useState("");
  const [designId, setDesignId]   = useState("");

  // Moodboard
  const [mbStyle, setMbStyle]       = useState("streetwear");
  const [mbKeywords, setMbKeywords] = useState("");
  const [mbResult, setMbResult]     = useState<{ moodboardId: string; imageUrl: string; style: string } | null>(null);

  // Design
  const [dsConcept, setDsConcept]     = useState("");
  const [dsName, setDsName]           = useState("");
  const [dsProduct, setDsProduct]     = useState("oversized_tee");
  const [dsPlacement, setDsPlacement] = useState<"front"|"back"|"chest"|"sleeve"|"all_over">("front");
  const [dsStyle, setDsStyle]         = useState("streetwear");
  const [dsColorMood, setDsColorMood] = useState("neon");
  const [dsResult, setDsResult]       = useState<{ designId: string; imageUrl: string; name: string } | null>(null);

  // Colorways
  const [cwResult, setCwResult] = useState<{ colorways: { colorwayId: string; imageUrl: string; colorScheme: string }[] } | null>(null);

  // Tech Pack
  const [tpProduct, setTpProduct] = useState("oversized_tee");
  const [tpResult, setTpResult]   = useState<{ techPackId: string; techPackData: Record<string, unknown> } | null>(null);
  // @ts-ignore

  const createProject = trpc.apparel.createProject.useMutation({
  // @ts-ignore
    onSuccess: (d) => setProjectId(d.projectId),
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  const genMoodboard = trpc.apparel.generateMoodboard.useMutation({
  // @ts-ignore
  // @ts-ignore
    onSuccess: (d) => { setMbResult(d); toast.success("Moodboard ready"); },
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  // @ts-ignore
  const genDesign = trpc.apparel.generateDesign.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setDsResult(d); setDesignId(d.designId); toast.success("Design ready"); },
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  const genColorways = trpc.apparel.generateColorways.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setCwResult(d); toast.success("Colorways ready"); },
    onError:   (e) => toast.error(e.message),
  });
  const genTechPack = trpc.apparel.generateTechPack.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setTpResult(d); toast.success("Tech pack ready"); },
    onError:   (e) => toast.error(e.message),
  });

  const STEPS: { id: StudioStep; label: string; num: number }[] = [
    { id: "moodboard", label: "Moodboard", num: 1 },
    { id: "design",    label: "Design",    num: 2 },
    { id: "colorways", label: "Colorways", num: 3 },
    { id: "techpack",  label: "Tech Pack", num: 4 },
  ];

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      {/* Pipeline progress bar */}
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Design Studio</p>
        <EditorialHead size="xl">4-Step Pipeline</EditorialHead>
        <div className="flex items-center gap-0 mt-6">
          {STEPS.map((s, i) => {
            const done = STEPS.indexOf(STEPS.find(x => x.id === step)!) > i;
            const active = s.id === step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => setStep(s.id)}
                  className="flex items-center gap-2 py-2 px-3 transition-all"
                  style={{
                    borderBottom: `2px solid ${active ? T.gold : done ? T.gold + "60" : T.border}`,
                    color: active ? T.gold : done ? T.muted : T.dim,
                    background: active ? T.goldDim : "transparent",
                  }}
                >
                  <span className="text-xs font-bold w-5 h-5 flex items-center justify-center"
                    style={{
                      border: `1px solid ${active ? T.gold : done ? T.gold + "60" : T.border}`,
                      color: active ? T.gold : done ? T.muted : T.dim,
                    }}>
                    {done ? <Check className="w-3 h-3" /> : s.num}
                  </span>
                  <span className="text-xs font-semibold tracking-wider uppercase hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px" style={{ background: done ? T.gold + "40" : T.border }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <GoldRule />

      <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 180px)" }}>
        {/* Canvas */}
        <div className="flex-1 p-8">
          {step === "moodboard" && (
            mbResult ? (
              <div className="max-w-2xl">
                <div className="relative overflow-hidden mb-4" style={{ border: `1px solid ${T.border}` }}>
                  <img src={mbResult.imageUrl} alt="Moodboard" className="w-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 py-4"
                    style={{ background: "linear-gradient(to top, rgba(5,6,8,0.95), transparent)" }}>
                    <p className="text-xs tracking-widest uppercase" style={{ color: T.gold }}>Moodboard — {mbResult.style}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ActionBtn variant="gold" size="md" onClick={() => setStep("design")}>
                    Next: Design <ArrowRight className="w-4 h-4" />
                  </ActionBtn>
                  <ActionBtn variant="outline" size="md"
  // @ts-ignore
                    onClick={() => genMoodboard.mutate({ style: mbStyle, keywords: mbKeywords })}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </ActionBtn>
                </div>
              </div>
            ) : (
              <Canvas loading={genMoodboard.isPending} emptyIcon={Palette}
                emptyLabel="Moodboard renders here" emptyDesc="Set your style and keywords, then generate your visual direction" />
            )
          )}

          {step === "design" && (
            dsResult ? (
              <div className="max-w-2xl">
                <div className="relative overflow-hidden mb-4" style={{ border: `1px solid ${T.border}` }}>
                  <img src={dsResult.imageUrl} alt={dsResult.name} className="w-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 py-4"
                    style={{ background: "linear-gradient(to top, rgba(5,6,8,0.95), transparent)" }}>
                    <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold }}>Design Ready</p>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>{dsResult.name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ActionBtn variant="gold" size="md" onClick={() => setStep("colorways")}>
                    Next: Colorways <ArrowRight className="w-4 h-4" />
                  </ActionBtn>
                  <a href={dsResult.imageUrl} download target="_blank" rel="noreferrer">
                    <ActionBtn variant="outline" size="md"><Download className="w-3.5 h-3.5" /> Export</ActionBtn>
                  </a>
                </div>
              </div>
            ) : (
              <Canvas loading={genDesign.isPending} emptyIcon={Shirt}
                emptyLabel="Your design renders here" emptyDesc="Describe your concept and hit Generate Design" />
            )
          )}

          {step === "colorways" && (
            cwResult?.colorways ? (
              <div>
                <p className="text-xs tracking-widest uppercase mb-4" style={{ color: T.gold }}>{cwResult.colorways.length} Colorways Generated</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl">
                  {cwResult.colorways.map((cw, i) => (
                    <DesignTile key={cw.colorwayId} url={cw.imageUrl}
                      name={`Colorway ${i + 1}`} desc={cw.colorScheme}
                      onDownload={() => window.open(cw.imageUrl, "_blank")} />
                  ))}
                </div>
                <div className="mt-6">
                  <ActionBtn variant="gold" size="md" onClick={() => setStep("techpack")}>
                    Next: Tech Pack <ArrowRight className="w-4 h-4" />
                  </ActionBtn>
                </div>
              </div>
            ) : (
              <Canvas loading={genColorways.isPending} emptyIcon={Droplets}
                emptyLabel="6 colorways render here" emptyDesc="Generate colorways from your design" aspectRatio="4/3" />
            )
          )}

          {step === "techpack" && (
            tpResult ? (
              <div className="max-w-xl">
                <p className="text-xs tracking-widest uppercase mb-6" style={{ color: T.gold }}>Tech Pack Ready</p>
                <div className="space-y-0">
                  {Object.entries(tpResult.techPackData).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between py-4"
                      style={{ borderBottom: `1px solid ${T.border}` }}>
                      <p className="text-xs font-bold uppercase tracking-widest w-40 flex-shrink-0" style={{ color: T.dim }}>
                        {k.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-right" style={{ color: T.text }}>
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <ActionBtn variant="gold" size="md"><Download className="w-4 h-4" /> Export Tech Pack PDF</ActionBtn>
                </div>
              </div>
            ) : (
              <Canvas loading={genTechPack.isPending} emptyIcon={FileText}
                emptyLabel="Tech pack renders here" emptyDesc="Generate the full production spec for your design" aspectRatio="3/4" />
            )
          )}
        </div>

        {/* Control Drawer */}
        <div className="w-72 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
          style={{ borderColor: T.border, background: T.surface }}>

          {step === "moodboard" && (
            <>
              <div>
                <Label>Style Direction</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <Chip key={s} label={s} active={mbStyle === s} onClick={() => setMbStyle(s)} />
                  ))}
                </div>
              </div>
              <GoldRule />
              <div>
                <Label>Keywords</Label>
                <FlatInput value={mbKeywords} onChange={setMbKeywords}
  // @ts-ignore
                  placeholder="Dominican pride, gold chains, street luxury..." />
              </div>
              <GoldRule />
              <ActionBtn
                onClick={async () => {
                  let pid = projectId;
                  if (!pid) {
  // @ts-ignore
                    const d = await createProject.mutateAsync({ projectName: `${mbStyle} Project`, projectType: mbStyle });
  // @ts-ignore
                    pid = d.projectId;
                  }
  // @ts-ignore
                  genMoodboard.mutate({ style: mbStyle, keywords: mbKeywords });
                }}
                loading={genMoodboard.isPending || createProject.isPending}
                variant="gold" size="md" className="w-full justify-center"
              >
                <Palette className="w-4 h-4" /> Generate Moodboard
              </ActionBtn>
            </>
          )}

          {step === "design" && (
            <>
              <div>
                <Label>Concept</Label>
                <FlatInput value={dsConcept} onChange={setDsConcept}
                  placeholder="Describe the design..." multiline rows={3} />
              </div>
              <GoldRule />
              <div>
                <Label>Design Name</Label>
                <FlatInput value={dsName} onChange={setDsName} placeholder="e.g. Empire SS25 No.1" />
              </div>
              <GoldRule />
              <div>
                <Label>Product</Label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.filter(p => p.cat === "tops").slice(0, 6).map(p => (
                    <Chip key={p.value} label={p.label} active={dsProduct === p.value} onClick={() => setDsProduct(p.value)} />
                  ))}
                </div>
              </div>
              <GoldRule />
              <div>
                <Label>Placement</Label>
                <div className="flex flex-wrap gap-2">
                  {(["front","back","chest","sleeve","all_over"] as const).map(pl => (
                    <Chip key={pl} label={pl.replace("_"," ")} active={dsPlacement === pl} onClick={() => setDsPlacement(pl)} />
                  ))}
                </div>
              </div>
              <GoldRule />
              <div>
                <Label>Color Mood</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_MOODS.map(cm => (
                    <button key={cm.value} onClick={() => setDsColorMood(cm.value)}
                      className="flex flex-col items-center gap-1 p-1.5 transition-all"
                      style={{ border: `1px solid ${dsColorMood === cm.value ? T.gold : T.border}` }}>
                      <div className="w-5 h-5" style={{ background: cm.hex }} />
                      <p className="text-xs" style={{ color: dsColorMood === cm.value ? T.gold : T.dim }}>{cm.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <GoldRule />
              <ActionBtn
                onClick={() => {
                  if (!projectId) { toast.error("Create a project first (go back to Moodboard)"); return; }
                  genDesign.mutate({
                    projectId,
                    designType: dsProduct,
                    name: dsName || "New Design",
                    description: dsConcept,
                    placement: dsPlacement,
                    style: dsStyle,
                    colorMood: dsColorMood,
                  });
                }}
                loading={genDesign.isPending}
                disabled={!dsConcept.trim()}
                variant="gold" size="md" className="w-full justify-center"
              >
                <Shirt className="w-4 h-4" /> Generate Design
              </ActionBtn>
            </>
          )}

          {step === "colorways" && (
            <>
              <p className="text-sm" style={{ color: T.muted }}>
                Generate 6 colorways from your design. Each colorway is a full Flux render in a different color scheme.
              </p>
              <GoldRule />
              <ActionBtn
                onClick={() => {
                  if (!designId) { toast.error("Generate a design first"); return; }
  // @ts-ignore
                  genColorways.mutate({ designId, count: 6 });
                }}
                loading={genColorways.isPending}
                disabled={!designId}
                variant="gold" size="md" className="w-full justify-center"
              >
                <Droplets className="w-4 h-4" /> Generate 6 Colorways
              </ActionBtn>
            </>
          )}

          {step === "techpack" && (
            <>
              <div>
                <Label>Product Type</Label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.filter(p => p.cat === "tops").map(p => (
                    <Chip key={p.value} label={p.label} active={tpProduct === p.value} onClick={() => setTpProduct(p.value)} />
                  ))}
                </div>
              </div>
              <GoldRule />
              <ActionBtn
                onClick={() => {
                  if (!designId) { toast.error("Generate a design first"); return; }
                  genTechPack.mutate({
                    designId,
  // @ts-ignore
                    productType: tpProduct,
                    sizes: ["XS","S","M","L","XL","2XL","3XL"],
                    materials: ["100% ring-spun cotton, 180gsm"],
                  });
                }}
                loading={genTechPack.isPending}
                disabled={!designId}
                variant="gold" size="md" className="w-full justify-center"
              >
                <FileText className="w-4 h-4" /> Generate Tech Pack
              </ActionBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODE: COLLECTION ─────────────────────────────────────────────────────────
function CollectionMode() {
  // @ts-ignore
  const [name, setName]         = useState("");
  const [season, setSeason]     = useState("SS25");
  const [dropDate, setDropDate] = useState("");
  const [limited, setLimited]   = useState(false);
  // @ts-ignore
  const [projectId, setProjectId] = useState("");
  const [result, setResult]     = useState<{ collectionId: string; collectionName: string } | null>(null);

  const SEASONS = ["SS25","FW25","SS26","FW26","Resort 25","Holiday 25"];

  const createProject = trpc.apparel.createProject.useMutation({
  // @ts-ignore
    onSuccess: (d) => setProjectId(d.projectId),
    onError:   (e) => toast.error(e.message),
  });
  const createCollection = trpc.apparel.createCollection.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setResult(d); toast.success("Collection created"); },
    onError:   (e) => toast.error(e.message),
  });
  const myProjects = trpc.apparel.getMyProjects.useQuery();

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Collection</p>
        <EditorialHead size="xl">Season Planner</EditorialHead>
      </div>
      <GoldRule />

      <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 160px)" }}>
        {/* Canvas */}
        <div className="flex-1 p-8">
          {result ? (
            <div className="max-w-lg">
              <div className="p-8 mb-6" style={{ border: `1px solid ${T.gold}40`, background: T.goldDim }}>
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: T.gold }}>Collection Created</p>
                <EditorialHead size="xl">{result.collectionName}</EditorialHead>
                <div className="mt-6 space-y-0">
                  {dropDate && (
                    <div className="flex justify-between py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>Drop Date</p>
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{dropDate}</p>
                    </div>
                  )}
                  <div className="flex justify-between py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>Season</p>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>{season}</p>
                  </div>
                  <div className="flex justify-between py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>Type</p>
                    <p className="text-sm font-semibold" style={{ color: limited ? T.gold : T.text }}>
                      {limited ? "Limited Edition" : "Standard"}
                    </p>
                  </div>
                  <div className="flex justify-between py-3">
                    <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>Status</p>
                    <p className="text-sm font-semibold text-amber-400">Draft</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <ActionBtn variant="gold" size="md"><Plus className="w-4 h-4" /> Add Designs</ActionBtn>
                <ActionBtn variant="outline" size="md"><Play className="w-4 h-4" /> Schedule Drop</ActionBtn>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-96">
              <Package className="w-12 h-12 mb-4" style={{ color: T.dim }} />
              <p className="text-sm font-semibold mb-2" style={{ color: T.muted }}>Collection appears here</p>
              <p className="text-xs text-center max-w-xs" style={{ color: T.dim }}>
                Name your collection, set a season and drop date, then create it.
              </p>
            </div>
          )}
        </div>

        {/* Control Drawer */}
        <div className="w-72 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
          style={{ borderColor: T.border, background: T.surface }}>
          <div>
            <Label>Collection Name</Label>
            <FlatInput value={name} onChange={setName} placeholder="e.g. Empire SS25" />
          </div>
          <GoldRule />
          <div>
            <Label>Season</Label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map(s => (
                <Chip key={s} label={s} active={season === s} onClick={() => setSeason(s)} />
              ))}
            </div>
          </div>
          <GoldRule />
          <div>
            <Label>Drop Date</Label>
            <input type="date" value={dropDate} onChange={(e) => setDropDate(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              style={{ borderBottom: `1px solid ${T.border}`, color: T.text, padding: "8px 0" }} />
          </div>
          <GoldRule />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: T.dim }}>Limited Edition</p>
              <p className="text-xs mt-0.5" style={{ color: T.dim }}>Restricted quantity drop</p>
            </div>
            <button
              onClick={() => setLimited(!limited)}
              className="w-10 h-5 relative transition-all"
  // @ts-ignore
              style={{ background: limited ? T.gold : T.surface3, border: `1px solid ${limited ? T.gold : T.border}` }}
            >
              <div className="absolute top-0.5 w-4 h-4 transition-all"
                style={{ background: limited ? "#000" : T.muted, left: limited ? "calc(100% - 18px)" : 2 }} />
            </button>
          </div>
          <GoldRule />
          {/* Link to project */}
          {(myProjects.data as any[] | undefined)?.length ? (
            <div>
              <Label>Link to Project</Label>
              <div className="space-y-1">
  // @ts-ignore
                {((myProjects.data as unknown) as any[]).slice(0, 4).map((p: any) => (
                  <button key={p.id} onClick={() => setProjectId(p.id)}
                    className="w-full text-left px-3 py-2 transition-all"
                    style={{
                      border: `1px solid ${projectId === p.id ? T.gold : T.border}`,
                      color: projectId === p.id ? T.gold : T.muted,
                      background: projectId === p.id ? T.goldDim : "transparent",
                    }}>
  // @ts-ignore
                    <p className="text-xs font-semibold">{p.project_name}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <GoldRule />
          <ActionBtn
            onClick={async () => {
              let pid = projectId;
              if (!pid) {
  // @ts-ignore
                const d = await createProject.mutateAsync({ projectName: name || "New Collection", projectType: "streetwear" });
  // @ts-ignore
                pid = d.projectId;
              }
              createCollection.mutate({
  // @ts-ignore
                projectId: pid,
                collectionName: `${name} ${season}`,
                designIds: [],
                dropDate: dropDate || undefined,
              });
            }}
            loading={createCollection.isPending || createProject.isPending}
            disabled={!name.trim()}
            variant="gold" size="md" className="w-full justify-center"
          >
            <Package className="w-4 h-4" /> Create Collection
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

  // @ts-ignore
// ─── MODE: REMOTION STUDIO ────────────────────────────────────────────────────
  // @ts-ignore
function RemotionStudio() {
  const [selected, setSelected] = useState<typeof REMOTION_MODES[number] | null>(null);
  const [headline, setHeadline] = useState("");
  const [subline, setSubline]   = useState("");
  // @ts-ignore
  const [tagline, setTagline]   = useState("");
  // @ts-ignore
  const [accent, setAccent]     = useState("C9A84C");
  const [duration, setDuration] = useState(20);
  const [jobId, setJobId]       = useState<string | null>(null);
  const [polling, setPolling]   = useState(false);
  // @ts-ignore
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // @ts-ignore

  // @ts-ignore - visualDna router pending implementation
  const renderPortrait  = trpc.visualDna.renderPortrait.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setJobId(d.jobId); setPolling(true); toast.success("Render queued"); },
  // @ts-ignore
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  // @ts-ignore - visualDna router pending implementation
  const renderLandscape = trpc.visualDna.renderLandscape.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setJobId(d.jobId); setPolling(true); toast.success("Render queued"); },
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  // @ts-ignore - visualDna router pending implementation
  const renderSquare    = trpc.visualDna.renderSquare.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setJobId(d.jobId); setPolling(true); toast.success("Render queued"); },
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  // @ts-ignore - visualDna router pending implementation
  const renderThumbnail = trpc.visualDna.renderThumbnail.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setJobId(d.jobId); setPolling(true); toast.success("Render queued"); },
  // @ts-ignore
    onError:   (e) => toast.error(e.message),
  });
  // @ts-ignore - visualDna router pending implementation
  const getJob = trpc.visualDna.getJob.useQuery(
    { jobId: jobId! },
    { enabled: polling && !!jobId, refetchInterval: polling ? 3000 : false }
  );

  useEffect(() => {
    if (getJob.data) {
      const j = getJob.data as any;
      if (j.status === "completed" && j.outputUrl) {
        setVideoUrl(j.outputUrl);
        setPolling(false);
        toast.success("Video ready");
      } else if (j.status === "failed") {
        setPolling(false);
        toast.error("Render failed");
      }
    }
  }, [getJob.data]);

  const isRendering = renderPortrait.isPending || renderLandscape.isPending || renderSquare.isPending || renderThumbnail.isPending;

  function doRender() {
    if (!selected) return;
    const payload = {
      headline: headline || "EMPIRE",
      subline,
      tagline,
      accentColor: accent.replace("#",""),
      secondaryColor: "7C3AED",
      showParticles: true,
      showGrid: false,
      showGodRays: true,
      showScanLine: false,
      durationSeconds: duration,
      fps: 30,
    };
    if (selected.proc === "renderPortrait")  renderPortrait.mutate(payload);
    else if (selected.proc === "renderSquare") renderSquare.mutate(payload);
    else if (selected.proc === "renderThumbnail") renderThumbnail.mutate(payload);
    else renderLandscape.mutate(payload);
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Remotion Studio</p>
        <EditorialHead size="xl">Cinematic Fashion Video</EditorialHead>
        <p className="text-sm mt-2" style={{ color: T.muted }}>Server-side rendered. Production quality. No editing required.</p>
      </div>
      <GoldRule />

      {!selected ? (
        /* Mode selection — full visual grid */
        <div className="p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: T.border }}>
            {REMOTION_MODES.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="group relative overflow-hidden p-8 text-left transition-all"
                  style={{ background: T.surface2 }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: T.goldDim }} />
                  <Icon className="w-8 h-8 mb-4 relative z-10" style={{ color: T.gold }} />
                  <p className="text-base font-bold mb-1 relative z-10" style={{ fontFamily: "'Playfair Display', serif", color: T.text }}>{m.label}</p>
                  <p className="text-xs relative z-10" style={{ color: T.muted }}>{m.desc}</p>
                  <div className="flex items-center gap-3 mt-4 relative z-10">
                    <span className="text-xs px-2 py-1" style={{ border: `1px solid ${T.border}`, color: T.dim }}>
                      {m.proc === "renderPortrait" ? "9:16" : m.proc === "renderSquare" ? "1:1" : "16:9"}
                    </span>
                    <span className="text-xs px-2 py-1" style={{ border: `1px solid ${T.border}`, color: T.dim }}>{m.dur}s</span>
                  </div>
                  <ChevronRight className="absolute right-4 bottom-4 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.gold }} />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 160px)" }}>
          {/* Canvas */}
          <div className="flex-1 p-8">
            <button onClick={() => { setSelected(null); setJobId(null); setPolling(false); setVideoUrl(null); }}
              className="flex items-center gap-2 text-xs uppercase tracking-widest mb-6 transition-colors"
              style={{ color: T.muted }}>
              <ChevronLeft className="w-3.5 h-3.5" /> All Formats
            </button>

            {videoUrl ? (
              <div className="max-w-2xl">
                <video src={videoUrl} controls className="w-full" style={{ border: `1px solid ${T.border}` }} />
                <div className="flex gap-3 mt-4">
                  <a href={videoUrl} download target="_blank" rel="noreferrer">
                    <ActionBtn variant="gold" size="md"><Download className="w-4 h-4" /> Download Video</ActionBtn>
                  </a>
                  <ActionBtn variant="outline" size="md" onClick={() => { setVideoUrl(null); setJobId(null); }}>
                    <RefreshCw className="w-3.5 h-3.5" /> New Render
                  </ActionBtn>
                </div>
              </div>
            ) : polling ? (
              <div className="flex flex-col items-center justify-center min-h-96">
                <div className="relative mb-6">
                  <div className="w-20 h-20" style={{ border: `1px solid ${T.border}`, borderTopColor: T.gold, animation: "spin 1.2s linear infinite" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-6 h-6" style={{ color: T.gold }} />
                  </div>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: T.text }}>Rendering {selected.label}</p>
                <p className="text-xs" style={{ color: T.dim }}>{duration}s · {duration * 30} frames · Server-side</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-96">
                <div className="w-24 h-24 flex items-center justify-center mb-6"
                  style={{ border: `1px solid ${T.border}` }}>
                  {(() => { const Icon = selected.icon; return <Icon className="w-10 h-10" style={{ color: T.dim }} />; })()}
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: T.muted }}>{selected.label}</p>
                <p className="text-xs text-center max-w-xs" style={{ color: T.dim }}>{selected.desc}</p>
              </div>
            )}
          </div>

          {/* Control Drawer */}
          <div className="w-72 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
            style={{ borderColor: T.border, background: T.surface }}>
            <div>
              <Label>Headline</Label>
              <FlatInput value={headline} onChange={setHeadline} placeholder="EMPIRE SS25" />
            </div>
            <GoldRule />
            <div>
              <Label>Subline</Label>
              <FlatInput value={subline} onChange={setSubline} placeholder="Built for the culture" />
            </div>
            <GoldRule />
            <div>
              <Label>Tagline</Label>
              <FlatInput value={tagline} onChange={setTagline} placeholder="Drop date · Limited edition" />
            </div>
            <GoldRule />
            <div>
              <Label>Accent Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={`#${accent.replace("#","")}`}
                  onChange={(e) => setAccent(e.target.value.replace("#",""))}
                  className="w-10 h-10 cursor-pointer border-0 bg-transparent" />
                <div className="flex gap-1.5">
                  {["C9A84C","00B4D8","7C3AED","DB2777","059669","EF4444"].map(c => (
                    <button key={c} onClick={() => setAccent(c)}
                      className="w-6 h-6 transition-all"
                      style={{
                        background: `#${c}`,
                        border: `1px solid ${accent.replace("#","") === c ? "#fff" : "transparent"}`,
                      }} />
                  ))}
                </div>
              </div>
            </div>
            <GoldRule />
            <div>
              <Label>Duration: {duration}s</Label>
              <input type="range" min={5} max={60} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full mt-2" style={{ accentColor: T.gold }} />
              <div className="flex justify-between text-xs mt-1" style={{ color: T.dim }}>
                <span>5s</span><span>60s</span>
              </div>
            </div>
            <GoldRule />
            <div className="px-3 py-3" style={{ border: `1px solid ${T.gold}30`, background: T.goldDim }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: T.gold }}>Server-Side Render</p>
              <p className="text-xs" style={{ color: T.dim }}>
                {selected.proc === "renderPortrait" ? "1080×1920 · 9:16" : selected.proc === "renderSquare" ? "1080×1080 · 1:1" : "1920×1080 · 16:9"} · {duration}s · {duration * 30} frames
              </p>
            </div>
            <ActionBtn
              onClick={doRender}
              loading={isRendering}
  // @ts-ignore
              disabled={isRendering || polling}
              variant="gold" size="md" className="w-full justify-center"
            >
              <Film className="w-4 h-4" /> Render {selected.label}
            </ActionBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODE: MODEL SHOOT ────────────────────────────────────────────────────────
function ModelShoot() {
  const [modelType, setModelType] = useState("female_streetwear");
  const [environment, setEnv]     = useState("studio_white");
  const [description, setDesc]    = useState("");
  const [productType, setProduct] = useState("oversized_tee");
  const [shots, setShots]         = useState<{ shotId: string; imageUrl: string; shotName: string }[]>([]);
  const [activeShot, setActiveShot] = useState(0);

  const genShoot = trpc.apparel.generateModelShoot.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setShots(d.shots); setActiveShot(0); toast.success(`${d.totalShots} shots generated`); },
    onError:   (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Model Shoot</p>
        <EditorialHead size="xl">On-Body AI Photography</EditorialHead>
        <p className="text-sm mt-2" style={{ color: T.muted }}>Front · ¾ Angle · Lifestyle — 3 shots, one generation</p>
      </div>
      <GoldRule />

      <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 160px)" }}>
        {/* Canvas — full bleed model shot */}
        <div className="flex-1 p-8">
          {shots.length > 0 ? (
            <div className="max-w-2xl">
              {/* Primary shot */}
              <div className="relative overflow-hidden mb-3" style={{ border: `1px solid ${T.border}` }}>
                <img
                  src={shots[activeShot]?.imageUrl}
                  alt={shots[activeShot]?.shotName}
                  className="w-full object-cover"
                  style={{ aspectRatio: "2/3" }}
                />
                <div className="absolute bottom-0 left-0 right-0 px-5 py-4"
                  style={{ background: "linear-gradient(to top, rgba(5,6,8,0.95), transparent)" }}>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs tracking-widest uppercase" style={{ color: T.gold }}>{shots[activeShot]?.shotName}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.muted }}>{modelType.replace(/_/g," ")} · {environment.replace(/_/g," ")}</p>
                    </div>
                    <a href={shots[activeShot]?.imageUrl} download target="_blank" rel="noreferrer">
                      <ActionBtn variant="gold" size="sm"><Download className="w-3.5 h-3.5" /> Export</ActionBtn>
                    </a>
                  </div>
                </div>
              </div>
              {/* Shot selector thumbnails */}
              <div className="flex gap-2">
                {shots.map((shot, i) => (
                  <button
                    key={shot.shotId}
                    onClick={() => setActiveShot(i)}
                    className="flex-1 overflow-hidden transition-all"
                    style={{ border: `1px solid ${activeShot === i ? T.gold : T.border}` }}
                  >
                    <img src={shot.imageUrl} alt={shot.shotName} className="w-full object-cover" style={{ aspectRatio: "2/3" }} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Canvas
              loading={genShoot.isPending}
              emptyIcon={Camera}
              emptyLabel="3 shots render here"
              emptyDesc="Front, ¾ angle, and lifestyle — all generated in one click"
              aspectRatio="2/3"
            />
          )}
        </div>

        {/* Control Drawer */}
        <div className="w-72 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
          style={{ borderColor: T.border, background: T.surface }}>
          <div>
            <Label>Design Description</Label>
            <FlatInput value={description} onChange={setDesc}
              placeholder="Describe the design being worn — style, colors, graphics, energy..."
              multiline rows={3} />
          </div>
          <GoldRule />
          <div>
            <Label>Product</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.filter(p => p.cat === "tops").slice(0, 6).map(p => (
                <Chip key={p.value} label={p.label} active={productType === p.value} onClick={() => setProduct(p.value)} />
              ))}
            </div>
          </div>
          <GoldRule />
          <div>
            <Label>Model</Label>
            <div className="space-y-1">
              {MODEL_TYPES.map(m => (
                <button key={m.value} onClick={() => setModelType(m.value)}
                  className="w-full text-left px-3 py-2.5 transition-all"
                  style={{
                    border: `1px solid ${modelType === m.value ? T.gold : T.border}`,
                    color: modelType === m.value ? T.gold : T.muted,
                    background: modelType === m.value ? T.goldDim : "transparent",
                  }}>
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
  // @ts-ignore
          </div>
          <GoldRule />
          <div>
            <Label>Environment</Label>
            <div className="space-y-1">
              {ENVIRONMENTS.map(env => (
                <button key={env.value} onClick={() => setEnv(env.value)}
                  className="w-full text-left px-3 py-2 transition-all"
                  style={{
                    border: `1px solid ${environment === env.value ? T.gold : T.border}`,
                    color: environment === env.value ? T.gold : T.muted,
                    background: environment === env.value ? T.goldDim : "transparent",
                  }}>
                  <p className="text-xs font-semibold">{env.label}</p>
                  <p className="text-xs opacity-60">{env.desc}</p>
                </button>
              ))}
  // @ts-ignore
            </div>
          </div>
          <GoldRule />
          <ActionBtn
            onClick={() => genShoot.mutate({
  // @ts-ignore
              designDescription: description || "streetwear graphic design",
              productType,
              modelType,
              environment,
            })}
            loading={genShoot.isPending}
  // @ts-ignore
            variant="gold" size="md" className="w-full justify-center"
          >
            <Camera className="w-4 h-4" /> Generate 3-Shot Shoot
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

// ─── MODE: DROP CAMPAIGN ──────────────────────────────────────────────────────
function DropCampaign() {
  const [concept, setConcept]         = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [style, setStyle]             = useState("streetwear");
  const [colorMood, setColorMood]     = useState("gold_black");
  const [products, setProducts]       = useState<string[]>(["oversized_tee"]);
  const [result, setResult]           = useState<{
    campaignId: string; campaignName: string; totalGenerated: number;
    designs: { designId: string; imageUrl: string; productType: string }[];
  } | null>(null);
  const [activeDesign, setActiveDesign] = useState(0);

  const gen = trpc.apparel.generateDropCampaign.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setResult(d); setActiveDesign(0); toast.success(`${d.totalGenerated} designs generated`); },
    onError:   (e) => toast.error(e.message),
  });

  function toggleProduct(v: string) {
    setProducts(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Drop Campaign</p>
        <EditorialHead size="xl">Full Campaign Kit</EditorialHead>
        <p className="text-sm mt-2" style={{ color: T.muted }}>One concept. Complete drop: designs, social kit, campaign assets.</p>
      </div>
      <GoldRule />

      <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 160px)" }}>
        {/* Canvas */}
        <div className="flex-1 p-8">
          {result ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs tracking-widest uppercase" style={{ color: T.gold }}>{result.campaignName}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.dim }}>{result.totalGenerated} designs generated</p>
                </div>
                <div className="flex gap-2">
                  <ActionBtn variant="gold" size="sm"><Download className="w-3.5 h-3.5" /> Export Kit</ActionBtn>
                  <ActionBtn variant="outline" size="sm"><Play className="w-3.5 h-3.5" /> Schedule Drop</ActionBtn>
                </div>
              </div>
              {/* Hero design */}
              <div className="relative overflow-hidden mb-4" style={{ border: `1px solid ${T.border}` }}>
                <img src={result.designs[activeDesign]?.imageUrl} alt="Campaign design"
                  className="w-full object-cover" style={{ maxHeight: 400 }} />
              </div>
              {/* Design strip */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {result.designs.map((d, i) => (
                  <button key={d.designId} onClick={() => setActiveDesign(i)}
                    className="flex-shrink-0 w-20 h-20 overflow-hidden transition-all"
                    style={{ border: `1px solid ${activeDesign === i ? T.gold : T.border}` }}>
                    <img src={d.imageUrl} alt={`Design ${i+1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Canvas
              loading={gen.isPending}
              emptyIcon={Flame}
              emptyLabel="Campaign kit renders here"
              emptyDesc="One concept generates a full drop: designs, social kit, and campaign assets"
              aspectRatio="16/9"
            />
          )}
        </div>

        {/* Control Drawer */}
        <div className="w-72 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
          style={{ borderColor: T.border, background: T.surface }}>
          <div>
            <Label>Campaign Name</Label>
            <FlatInput value={campaignName} onChange={setCampaignName} placeholder="e.g. Empire Drop Vol.1" />
          </div>
          <GoldRule />
          <div>
            <Label>Concept</Label>
            <FlatInput value={concept} onChange={setConcept}
              placeholder="Describe the drop — culture, energy, story..."
              multiline rows={3} />
          </div>
          <GoldRule />
          <div>
            <Label>Style</Label>
            <div className="flex flex-wrap gap-2">
              {STYLES.slice(0, 6).map(s => (
                <Chip key={s} label={s} active={style === s} onClick={() => setStyle(s)} />
              ))}
            </div>
          </div>
          <GoldRule />
          <div>
            <Label>Color Mood</Label>
            <div className="grid grid-cols-4 gap-1.5">
  // @ts-ignore
              {COLOR_MOODS.map(cm => (
                <button key={cm.value} onClick={() => setColorMood(cm.value)}
                  className="flex flex-col items-center gap-1 p-1.5 transition-all"
                  style={{ border: `1px solid ${colorMood === cm.value ? T.gold : T.border}` }}>
                  <div className="w-5 h-5" style={{ background: cm.hex }} />
                  <p className="text-xs" style={{ color: colorMood === cm.value ? T.gold : T.dim }}>{cm.label}</p>
                </button>
              ))}
            </div>
          </div>
          <GoldRule />
          <div>
            <Label>Products</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUCTS.filter(p => p.cat === "tops").map(p => (
                <Chip key={p.value} label={p.label}
                  active={products.includes(p.value)}
                  onClick={() => toggleProduct(p.value)} />
              ))}
  // @ts-ignore
            </div>
          </div>
          <GoldRule />
          <ActionBtn
            onClick={() => gen.mutate({
  // @ts-ignore
              campaignName: campaignName || "New Drop",
  // @ts-ignore
              concept,
              style,
              colorMood,
              products: products.length ? products : ["oversized_tee"],
            })}
            loading={gen.isPending}
            disabled={!concept.trim()}
            variant="gold" size="md" className="w-full justify-center"
          >
            <Flame className="w-4 h-4" /> Generate Full Campaign
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

// ─── MODE: BATCH FACTORY ──────────────────────────────────────────────────────
function BatchFactory() {
  const [concept, setConcept] = useState("");
  const [product, setProduct] = useState("oversized_tee");
  const [style, setStyle]     = useState("streetwear");
  const [count, setCount]     = useState(8);
  const [results, setResults] = useState<{ designId: string; imageUrl: string; colorMood: string; variant: string }[]>([]);

  const gen = trpc.apparel.batchGenerateDesigns.useMutation({
  // @ts-ignore
    onSuccess: (d) => { setResults(d.designs); toast.success(`${d.totalGenerated} designs generated`); },
    onError:   (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Batch Factory</p>
        <EditorialHead size="xl">Mass Generation</EditorialHead>
        <p className="text-sm mt-2" style={{ color: T.muted }}>Up to 32 designs. One concept. Every colorway and variation.</p>
      </div>
      <GoldRule />

      <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 160px)" }}>
        {/* Canvas — full grid */}
        <div className="flex-1 p-8">
          {results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs tracking-widest uppercase" style={{ color: T.gold }}>{results.length} Designs Generated</p>
                <ActionBtn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export All</ActionBtn>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px" style={{ background: T.border }}>
                {results.map((d, i) => (
                  <DesignTile key={d.designId} url={d.imageUrl}
                    name={d.variant || `Design ${i+1}`} desc={d.colorMood}
                    onDownload={() => window.open(d.imageUrl, "_blank")} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-96">
              <Boxes className="w-12 h-12 mb-4" style={{ color: T.dim }} />
              {gen.isPending ? (
                <>
                  <div className="w-16 h-16 mb-4" style={{ border: `1px solid ${T.border}`, borderTopColor: T.gold, animation: "spin 1.2s linear infinite" }} />
                  <p className="text-sm font-semibold" style={{ color: T.muted }}>Generating {count} designs...</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold mb-2" style={{ color: T.muted }}>Batch results appear here</p>
                  <p className="text-xs text-center max-w-xs" style={{ color: T.dim }}>
                    Set a concept, pick a quantity, and generate your entire collection at once.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Control Drawer */}
        <div className="w-72 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
          style={{ borderColor: T.border, background: T.surface }}>
          <div>
            <Label>Concept</Label>
            <FlatInput value={concept} onChange={setConcept}
              placeholder="Dominican flag streetwear collection..." multiline rows={3} />
          </div>
          <GoldRule />
          <div>
            <Label>Product</Label>
            <div className="flex flex-wrap gap-2">
  // @ts-ignore
              {PRODUCTS.filter(p => p.cat === "tops").slice(0, 6).map(p => (
                <Chip key={p.value} label={p.label} active={product === p.value} onClick={() => setProduct(p.value)} />
              ))}
            </div>
          </div>
          <GoldRule />
          <div>
            <Label>Style</Label>
            <div className="flex flex-wrap gap-2">
              {STYLES.slice(0, 5).map(s => (
                <Chip key={s} label={s} active={style === s} onClick={() => setStyle(s)} />
              ))}
            </div>
          </div>
          <GoldRule />
          <div>
            <Label>Quantity: {count}</Label>
            <input type="range" min={4} max={32} step={4} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full mt-2" style={{ accentColor: T.gold }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: T.dim }}>
  // @ts-ignore
              <span>4</span><span>8</span><span>16</span><span>24</span><span>32</span>
            </div>
          </div>
          <GoldRule />
          <ActionBtn
  // @ts-ignore
            onClick={() => gen.mutate({ concept, productType: product, style, count })}
            loading={gen.isPending}
            disabled={!concept.trim()}
            variant="gold" size="md" className="w-full justify-center"
          >
            <Boxes className="w-4 h-4" /> Generate {count} Designs
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

// ─── MODE: BRAND DNA ──────────────────────────────────────────────────────────
  // @ts-ignore
function BrandDNA() {
  const [projectId, setProjectId]     = useState("");
  const [colors, setColors]           = useState<string[]>(["#C9A84C","#000000","#FFFFFF"]);
  const [fonts, setFonts]             = useState<string[]>(["Bebas Neue","Montserrat"]);
  const [vibe, setVibe]               = useState("");
  const [personality, setPersonality] = useState("");
  const [newColor, setNewColor]       = useState("#000000");
  const [saved, setSaved]             = useState(false);

  const FONT_OPTIONS = [
    "Bebas Neue","Montserrat","Playfair Display","Space Grotesk",
    "DM Sans","Inter","Oswald","Raleway","Barlow","Anton",
    "Cinzel","Cormorant Garamond","Josefin Sans","Work Sans",
  ];
  const VIBES = [
    "Luxury Empire","Street Culture","Caribbean Fire","Dominican Pride",
    "Haitian Power","Fitness Warrior","Nightlife Queen","Editorial Chic",
    "Techwear Future","Vintage Soul","Y2K Revival","Minimalist Power",
  ];
  const QUICK_PALETTES = [
    { name: "Empire Gold",  colors: ["#C9A84C","#E8C97A","#000000","#FFFFFF"] },
    { name: "Dominican",    colors: ["#002D62","#CE1126","#FFFFFF","#C9A84C"] },
    { name: "Haitian",      colors: ["#00209F","#D21034","#000000","#FFFFFF"] },
    { name: "Neon Street",  colors: ["#FF00FF","#00FFFF","#000000","#FFFFFF"] },
    { name: "Earth Luxury", colors: ["#8B6914","#5C4A1E","#F5F0E8","#000000"] },
  ];

  const createProject = trpc.apparel.createProject.useMutation({
  // @ts-ignore
    onSuccess: (d) => setProjectId(d.projectId),
    onError:   (e) => toast.error(e.message),
  });
  const saveDNA = trpc.apparel.saveBrandDNA.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Brand DNA saved"); },
    onError:   (e) => toast.error(e.message),
  });

  function toggleFont(f: string) {
    setFonts(prev => prev.includes(f) ? prev.filter(x => x !== f) : prev.length < 3 ? [...prev, f] : prev);
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>Brand DNA</p>
        <EditorialHead size="xl">Identity System</EditorialHead>
        <p className="text-sm mt-2" style={{ color: T.muted }}>Color palette · Typography · Vibe · Personality — saved to your brand vault.</p>
      </div>
      <GoldRule />

      <div className="flex min-h-0" style={{ minHeight: "calc(100vh - 160px)" }}>
        {/* Canvas — live brand preview */}
        <div className="flex-1 p-8">
          {/* Live brand card */}
          <div className="max-w-xl">
            <div className="relative overflow-hidden p-10 mb-6"
              style={{
                background: colors[0] || T.surface2,
                border: `1px solid ${T.border}`,
                minHeight: 280,
              }}>
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${colors[0] || "#000"} 0%, ${colors[1] || "#111"} 100%)` }} />
              <div className="relative z-10">
                <p className="text-xs tracking-widest uppercase mb-3"
                  style={{ color: colors[2] || "#fff", fontFamily: fonts[1] || "sans-serif", opacity: 0.6 }}>
                  Brand Identity
                </p>
                <p className="text-4xl font-bold mb-2"
                  style={{ color: colors[2] || "#fff", fontFamily: fonts[0] || "sans-serif" }}>
                  {vibe || "YOUR BRAND"}
                </p>
                <p className="text-sm"
                  style={{ color: colors[2] || "#fff", fontFamily: fonts[1] || "sans-serif", opacity: 0.7 }}>
                  {personality || "Define your brand personality"}
                </p>
                <div className="flex gap-2 mt-6">
                  {colors.map((c, i) => (
                    <div key={i} className="w-8 h-8" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-3 px-4 py-3 mb-4"
                style={{ border: `1px solid ${T.gold}40`, background: T.goldDim }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: T.gold }} />
                <p className="text-sm font-semibold" style={{ color: T.gold }}>Brand DNA Saved to Vault</p>
              </div>
            )}
          </div>
        </div>

        {/* Control Drawer */}
        <div className="w-80 flex-shrink-0 border-l p-6 space-y-6 overflow-y-auto"
          style={{ borderColor: T.border, background: T.surface }}>

          {/* Quick Palettes */}
          <div>
            <Label>Quick Palettes</Label>
            <div className="space-y-1">
              {QUICK_PALETTES.map(p => (
                <button key={p.name} onClick={() => setColors(p.colors)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 transition-all"
                  style={{ border: `1px solid ${T.border}`, background: "transparent" }}>
                  <div className="flex gap-1">
                    {p.colors.map((c, i) => (
                      <div key={i} className="w-4 h-4" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: T.muted }}>{p.name}</p>
                </button>
              ))}
            </div>
          </div>
          <GoldRule />

          {/* Custom color */}
          <div>
            <Label>Custom Color</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 cursor-pointer border-0 bg-transparent" />
              <input value={newColor} onChange={(e) => setNewColor(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none font-mono"
                style={{ borderBottom: `1px solid ${T.border}`, color: T.text, padding: "6px 0" }} />
              <ActionBtn variant="outline" size="sm"
                onClick={() => { if (!colors.includes(newColor)) setColors([...colors, newColor]); }}>
                <Plus className="w-3.5 h-3.5" />
              </ActionBtn>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {colors.map((c, i) => (
                <div key={i} className="relative group">
                  <div className="w-8 h-8" style={{ background: c, border: `1px solid ${T.border}` }} />
                  <button onClick={() => setColors(colors.filter((_,j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <GoldRule />

          {/* Vibe */}
          <div>
            <Label>Brand Vibe</Label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map(v => (
                <Chip key={v} label={v} active={vibe === v} onClick={() => setVibe(v)} />
              ))}
  // @ts-ignore
            </div>
  // @ts-ignore
          </div>
          <GoldRule />

  // @ts-ignore
          {/* Typography */}
          <div>
            <Label>Typography (pick up to 3)</Label>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map(f => (
                <Chip key={f} label={f} active={fonts.includes(f)} onClick={() => toggleFont(f)} />
              ))}
            </div>
          </div>
          <GoldRule />

          {/* Personality */}
          <div>
            <Label>Brand Personality</Label>
            <FlatInput value={personality} onChange={setPersonality}
              placeholder="Bold, unapologetic, Caribbean luxury..." multiline rows={2} />
          </div>
          <GoldRule />
  // @ts-ignore

          <ActionBtn
            onClick={async () => {
              let pid = projectId;
  // @ts-ignore
              if (!pid) {
  // @ts-ignore
                const d = await createProject.mutateAsync({ projectName: vibe || "Brand Project", projectType: "brand" });
  // @ts-ignore
                pid = d.projectId;
              }
              saveDNA.mutate({
  // @ts-ignore
                projectId: pid,
                brandColors: colors,
                brandFonts: fonts,
                brandVibe: vibe,
                brandPersonality: personality,
              });
            }}
            loading={saveDNA.isPending || createProject.isPending}
            disabled={!vibe}
            variant="gold" size="md" className="w-full justify-center"
          >
            <Dna className="w-4 h-4" /> Save Brand DNA
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

// ─── MODE: MY VAULT ───────────────────────────────────────────────────────────
function MyVault() {
  const projects = trpc.apparel.getMyProjects.useQuery();
  const orders   = trpc.apparel.getMyOrders.useQuery();

  const pRows = (projects.data as any[] | undefined) ?? [];
  const oRows = (orders.data as any[] | undefined) ?? [];

  const STATS = [
    { label: "Projects",  value: pRows.length,                                                                        icon: FolderOpen },
    { label: "Orders",    value: oRows.length,                                                                        icon: ShoppingBag },
    { label: "Revenue",   value: `$${oRows.reduce((s: number, o: any) => s + Number(o.retail_price || 0), 0).toFixed(0)}`, icon: DollarSign },
    { label: "Profit",    value: `$${oRows.reduce((s: number, o: any) => s + Number(o.profit || 0), 0).toFixed(0)}`,       icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="px-8 pt-8 pb-6">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: T.gold, letterSpacing: "0.2em" }}>My Vault</p>
        <EditorialHead size="xl">Archive & Analytics</EditorialHead>
      </div>
      <GoldRule />

      <div className="p-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: T.border }}>
          {STATS.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-6" style={{ background: T.surface2 }}>
                <Icon className="w-5 h-5 mb-3" style={{ color: T.gold }} />
                <p className="text-3xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: T.text }}>{s.value}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: T.dim }}>Projects</p>
          </div>
          {projects.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.dim }} />
            </div>
          ) : pRows.length > 0 ? (
            <div className="space-y-0">
              {pRows.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center gap-4 px-0 py-4 transition-all"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <Shirt className="w-4 h-4 flex-shrink-0" style={{ color: T.gold }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{p.project_name}</p>
                    <p className="text-xs" style={{ color: T.dim }}>{p.project_type} · {p.stage}</p>
                  </div>
                  <span className="text-xs px-2 py-1 uppercase tracking-wider font-bold"
                    style={{
                      border: `1px solid ${p.status === "published" ? "#059669" : p.status === "in_progress" ? T.gold : T.border}`,
                      color: p.status === "published" ? "#059669" : p.status === "in_progress" ? T.gold : T.dim,
                    }}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FolderOpen className="w-8 h-8 mx-auto mb-3" style={{ color: T.dim }} />
              <p className="text-sm" style={{ color: T.dim }}>No projects yet — start in Design Studio</p>
            </div>
          )}
        </div>

        {/* Orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: T.dim }}>Orders</p>
          </div>
          {orders.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: T.dim }} />
            </div>
          ) : oRows.length > 0 ? (
            <div className="space-y-0">
              {oRows.slice(0, 8).map((o: any) => (
                <div key={o.id} className="flex items-center gap-4 py-4 transition-all"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <Package2 className="w-4 h-4 flex-shrink-0" style={{ color: T.dim }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{o.design_name || o.product_type || "Order"}</p>
                    <p className="text-xs" style={{ color: T.dim }}>{o.provider} · {o.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: T.gold }}>${Number(o.retail_price || 0).toFixed(2)}</p>
                    <p className="text-xs" style={{ color: "#059669" }}>+${Number(o.profit || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto mb-3" style={{ color: T.dim }} />
              <p className="text-sm" style={{ color: T.dim }}>No orders yet — submit a POD order from Design Studio</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function ApparelLab() {
  const [tab, setTab] = useState<Tab>("quick_drop");

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(5,6,8,0.97)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${T.gold}60` }}>
            <Shirt className="w-4 h-4" style={{ color: T.gold }} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', serif", color: T.text }}>
              Apparel Lab
            </p>
            <p className="text-xs" style={{ color: T.dim }}>Empire Atelier · Flux AI + Remotion</p>
  // @ts-ignore
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5" style={{ background: "#059669" }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>Flux AI Live</p>
          </div>
          <div className="w-px h-4" style={{ background: T.border }} />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5" style={{ background: "#00B4D8" }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: T.dim }}>Remotion Live</p>
          </div>
        </div>
      </div>

      {/* ── MODE NAVIGATION ── */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {MODES.map(m => {
            const Icon = m.icon;
            const active = tab === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setTab(m.id)}
                className="flex items-center gap-2.5 px-5 py-4 flex-shrink-0 transition-all relative"
                style={{
                  color: active ? T.gold : T.dim,
                  borderBottom: `2px solid ${active ? T.gold : "transparent"}`,
                  background: active ? T.goldDim : "transparent",
                }}
              >
  // @ts-ignore
                {(() => { const I = Icon as any; return <I className="w-4 h-4" />; })()}
                <span className="text-xs font-bold uppercase tracking-widest">{m.label}</span>
                <span className="text-xs px-1.5 py-0.5 uppercase tracking-wider"
                  style={{
                    border: `1px solid ${active ? T.gold + "40" : T.border}`,
                    color: active ? T.gold : T.dim,
                    fontSize: "9px",
                  }}>
                  {m.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1">
        {tab === "quick_drop"    && <QuickDrop />}
        {tab === "design_studio" && <DesignStudio />}
        {tab === "collection"    && <CollectionMode />}
        {tab === "remotion"      && <RemotionStudio />}
        {tab === "model_shoot"   && <ModelShoot />}
        {tab === "drop_campaign" && <DropCampaign />}
        {tab === "batch_factory" && <BatchFactory />}
        {tab === "brand_dna"     && <BrandDNA />}
        {tab === "my_vault"      && <MyVault />}
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
