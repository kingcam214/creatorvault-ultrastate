/**
 * ============================================================
 * CREATORVAULT — SPATIAL COMPOSER
 * Full-screen visual-first post creation canvas
 * Media first · Controls as vertical rail · AI CTA suggestions
 * ============================================================
 */
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  X, Image, Video, Type, ShoppingBag, BookOpen, Award,
  TrendingUp, Flame, Target, Zap, ChevronRight, Upload,
  Globe, Users, Lock, Send
} from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0a0a",
  surface: "#141414",
  surfaceHigh: "#1a1a1a",
  border: "rgba(255,255,255,0.08)",
  text: "#f5f0e8",
  textMuted: "rgba(245,240,232,0.45)",
  gold: "#c9a84c",
  goldDim: "rgba(201,168,76,0.15)",
};

// ── Post type options ─────────────────────────────────────────────────────────
const POST_TYPES = [
  { key: "organic", label: "Post", icon: <Type className="w-4 h-4" />, color: T.textMuted },
  { key: "proof_drop", label: "Proof Drop", icon: <Award className="w-4 h-4" />, color: T.gold, hint: "Share a verified win" },
  { key: "creator_win", label: "Creator Win", icon: <Flame className="w-4 h-4" />, color: T.gold, hint: "Celebrate a milestone" },
  { key: "product_drop", label: "Product Drop", icon: <ShoppingBag className="w-4 h-4" />, color: "#7c4dff", hint: "Announce a product" },
  { key: "lesson_snippet", label: "Lesson", icon: <BookOpen className="w-4 h-4" />, color: "#4a9eff", hint: "Share a teaching moment" },
  { key: "monetization_insight", label: "Insight", icon: <TrendingUp className="w-4 h-4" />, color: "#00c896", hint: "Share a money lesson" },
  { key: "opportunity", label: "Opportunity", icon: <Target className="w-4 h-4" />, color: "#ff6b35", hint: "Share a collab or deal" },
];

const VISIBILITY_OPTIONS = [
  { key: "public", label: "Public", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "followers", label: "Followers", icon: <Users className="w-3.5 h-3.5" /> },
  { key: "private", label: "Private", icon: <Lock className="w-3.5 h-3.5" /> },
];

// ── AI CTA suggestions ────────────────────────────────────────────────────────
const AI_CTAS: Record<string, string[]> = {
  proof_drop: [
    "Link your product in the Showcase tab to convert this win into sales.",
    "Turn this into a case study — create a course lesson from it.",
    "Add a product tag to let followers buy what helped you get here.",
  ],
  creator_win: [
    "Post your next milestone goal in the comments to build accountability.",
    "Tag the tool or strategy that made this happen.",
  ],
  product_drop: [
    "Add a product tag so followers can buy directly from this post.",
    "Include the transformation this product delivers in your caption.",
  ],
  lesson_snippet: [
    "Tag the full course so followers can go deeper.",
    "Ask a question at the end to drive comments.",
  ],
  monetization_insight: [
    "Back this up with a number or a personal example.",
    "Link to the product or course that taught you this.",
  ],
  organic: [],
};

// ── Media Drop Zone ───────────────────────────────────────────────────────────
function MediaDropZone({
  mediaUrls,
  onAdd,
  onRemove,
}: {
  mediaUrls: string[];
  onAdd: (url: string, type: "image" | "video") => void;
  onRemove: (i: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      onAdd(url, file.type.startsWith("video") ? "video" : "image");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  if (mediaUrls.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragging ? T.gold : T.border}`,
          borderRadius: "2px",
          background: dragging ? T.goldDim : "transparent",
          minHeight: "300px",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-8 h-8 mb-3" style={{ color: T.textMuted }} />
        <p className="text-sm font-semibold mb-1" style={{ color: T.text }}>
          Drop media here
        </p>
        <p className="text-xs" style={{ color: T.textMuted }}>
          or click to browse · JPG, PNG, MP4
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: "300px" }}>
      <div className="grid gap-2 h-full" style={{ gridTemplateColumns: mediaUrls.length > 1 ? "1fr 1fr" : "1fr" }}>
        {mediaUrls.map((url, i) => (
          <div key={i} className="relative" style={{ background: "#000", borderRadius: "2px", overflow: "hidden" }}>
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, borderRadius: "2px" }}
            >
              <X className="w-3.5 h-3.5" style={{ color: T.text }} />
            </button>
          </div>
        ))}
      </div>
      {mediaUrls.length < 4 && (
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
          style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, color: T.text, borderRadius: "2px" }}
        >
          + Add
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ── Main Composer ─────────────────────────────────────────────────────────────
export default function SpatialComposer() {
  const [, navigate] = useLocation();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("organic");
  const [visibility, setVisibility] = useState("public");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"text" | "image" | "video" | "mixed">("text");
  const [showTypePanel, setShowTypePanel] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const createPost = trpc.post.create.useMutation();
  const currentType = POST_TYPES.find((t) => t.key === postType) ?? POST_TYPES[0];
  const ctaSuggestions = AI_CTAS[postType] ?? [];

  const handleAddMedia = (url: string, type: "image" | "video") => {
    setMediaUrls((prev) => [...prev, url]);
    setMediaType((prev) => {
      if (prev === "text") return type;
      if (prev === type) return type;
      return "mixed";
    });
  };

  const handleRemoveMedia = (i: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== i));
    if (mediaUrls.length <= 1) setMediaType("text");
  };

  const handlePost = async () => {
    if (!content.trim() && mediaUrls.length === 0) return;
    setIsPosting(true);
    try {
      await createPost.mutateAsync({
        content: content.trim() || undefined,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        media_type: mediaType,
        visibility: visibility as any,
      });
      navigate("/feed");
    } catch (e) {
      console.error(e);
      setIsPosting(false);
    }
  };

  const charCount = content.length;
  const charLimit = 5000;
  const charPct = (charCount / charLimit) * 100;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >
        <button onClick={() => navigate("/feed")} style={{ color: T.textMuted }}>
          <X className="w-5 h-5" />
        </button>

        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: T.text }}
        >
          Compose
        </h2>

        <button
          onClick={handlePost}
          disabled={isPosting || (!content.trim() && mediaUrls.length === 0)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-opacity disabled:opacity-40"
          style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
        >
          {isPosting ? "Posting..." : (
            <>
              <Send className="w-3.5 h-3.5" />
              Post
            </>
          )}
        </button>
      </div>

      {/* ── Main canvas ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Media canvas ── */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <MediaDropZone
            mediaUrls={mediaUrls}
            onAdd={handleAddMedia}
            onRemove={handleRemoveMedia}
          />

          {/* Caption */}
          <div className="mt-4 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === "proof_drop" ? "Describe your win. Be specific — numbers convert." :
                postType === "product_drop" ? "What does this product do for your buyer?" :
                postType === "lesson_snippet" ? "What's the one thing they need to know?" :
                "What's on your mind?"
              }
              maxLength={charLimit}
              rows={4}
              className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
              style={{
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: "2px",
                padding: "12px",
                fontFamily: "Inter, sans-serif",
              }}
            />
            {/* Char counter */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full"
                style={{
                  background: `conic-gradient(${charPct > 90 ? "#ff4444" : T.gold} ${charPct * 3.6}deg, ${T.surfaceHigh} 0deg)`,
                }}
              />
              {charCount > charLimit * 0.8 && (
                <span className="text-xs" style={{ color: charPct > 90 ? "#ff4444" : T.textMuted }}>
                  {charLimit - charCount}
                </span>
              )}
            </div>
          </div>

          {/* AI CTA suggestions */}
          {ctaSuggestions.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3" style={{ color: T.gold }} />
                <p className="text-xs uppercase tracking-widest" style={{ color: T.gold }}>
                  AI Suggestions
                </p>
              </div>
              <div className="space-y-1.5">
                {ctaSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setContent((prev) => prev ? `${prev}\n\n${s}` : s)}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-opacity hover:opacity-80"
                    style={{
                      background: T.surfaceHigh,
                      border: `1px solid ${T.border}`,
                      borderRadius: "2px",
                      color: T.textMuted,
                    }}
                  >
                    <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: T.gold }} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Control Rail ── */}
        <div
          className="w-56 flex-shrink-0 flex flex-col py-4 px-3 space-y-4 overflow-y-auto"
          style={{ borderLeft: `1px solid ${T.border}` }}
        >
          {/* Post type selector */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: T.textMuted }}>
              Type
            </p>
            <button
              onClick={() => setShowTypePanel(!showTypePanel)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-opacity hover:opacity-80"
              style={{
                background: T.surfaceHigh,
                border: `1px solid ${currentType.color}`,
                borderRadius: "2px",
                color: currentType.color,
              }}
            >
              <div className="flex items-center gap-2">
                {currentType.icon}
                <span className="font-semibold">{currentType.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {showTypePanel && (
              <div
                className="mt-1 overflow-hidden"
                style={{ border: `1px solid ${T.border}`, borderRadius: "2px", background: T.surface }}
              >
                {POST_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setPostType(t.key); setShowTypePanel(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-opacity hover:opacity-80"
                    style={{
                      color: postType === t.key ? t.color : T.textMuted,
                      background: postType === t.key ? T.goldDim : "transparent",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <span style={{ color: t.color }}>{t.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-xs">{t.label}</p>
                      {t.hint && <p className="text-xs opacity-60">{t.hint}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: T.textMuted }}>
              Visibility
            </p>
            <div className="space-y-1">
              {VISIBILITY_OPTIONS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setVisibility(v.key)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-all"
                  style={{
                    color: visibility === v.key ? T.gold : T.textMuted,
                    background: visibility === v.key ? T.goldDim : "transparent",
                    border: `1px solid ${visibility === v.key ? T.gold : "transparent"}`,
                    borderRadius: "2px",
                  }}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proof metric (for proof drops) */}
          {(postType === "proof_drop" || postType === "creator_win") && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: T.textMuted }}>
                Proof Metric
              </p>
              <input
                type="text"
                placeholder="e.g. $1,247 in 48 hrs"
                className="w-full px-3 py-2 text-sm bg-transparent outline-none"
                style={{
                  border: `1px solid ${T.gold}`,
                  borderRadius: "2px",
                  color: T.gold,
                  fontFamily: "Playfair Display, serif",
                }}
              />
              <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                Shown as an overlay on your media
              </p>
            </div>
          )}

          {/* Realm toggle */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: T.textMuted }}>
              Realm
            </p>
            <div className="flex gap-1">
              {["sfw", "adult"].map((r) => (
                <button
                  key={r}
                  className="flex-1 py-1.5 text-xs font-bold uppercase tracking-widest"
                  style={{
                    background: T.surfaceHigh,
                    border: `1px solid ${T.border}`,
                    color: T.textMuted,
                    borderRadius: "2px",
                  }}
                >
                  {r === "sfw" ? "SFW" : "18+"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
