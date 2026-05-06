/**
 * ThumbnailGeneratorUI — Dual-Mode Thumbnail Generator
 *
 * Automatically adapts to the creator's mode:
 * - ADULT (VaultX): body-positive niches, desire-grade aesthetics, PPV teaser styles
 * - SFW (General): YouTube/TikTok/Instagram niches, standard platform styles
 *
 * Mode is read from CreatorModeContext — no manual switching needed here.
 * The creator sets their mode once and all tools adapt.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Image, ChevronLeft, Zap, RefreshCw, Download, Sparkles } from "lucide-react";
import { useCreatorMode, CreatorModeSwitcher } from "@/contexts/CreatorModeContext";

// SFW platform styles (general creators)
const SFW_STYLES = ["youtube", "tiktok", "instagram", "cinematic", "bold", "minimal", "neon", "retro"];
// Adult platform styles (VaultX creators)
const ADULT_STYLES = ["desire_grade", "velvet", "intimate", "bold", "cinematic", "minimal", "neon", "editorial"];

const MOODS = ["hype", "calm", "dramatic", "sensual", "inspirational", "dark", "bright", "mysterious"];

export function ThumbnailGeneratorUI() {
  const { toast } = useToast();
  const creatorMode = useCreatorMode();

  const [title, setTitle] = useState("");
  const [style, setStyle] = useState(creatorMode.isAdult ? "desire_grade" : "youtube");
  const [mood, setMood] = useState(creatorMode.isAdult ? "sensual" : "hype");
  const [mainText, setMainText] = useState("");
  const [selectedNiche, setSelectedNiche] = useState(creatorMode.thumbnailNiches[0]?.value ?? "");
  const [generated, setGenerated] = useState<any[]>([]);

  // Use real generateThumbnailConcept procedure — it exists and works
  const generateConcept = trpc.thumbnailGenerator.generateThumbnailConcept.useMutation({
    onSuccess: (d) => {
      toast({ title: "Thumbnail Concept Generated" });
      setGenerated((prev) => [{ concept: d.concept, title, style, mood, niche: selectedNiche }, ...prev]);
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const generateText = trpc.thumbnailGenerator.generateThumbnailText.useMutation({
    onSuccess: (d) => {
      toast({ title: "Hook Text Generated" });
      setMainText(d.options?.split("\n")[0]?.replace(/^\d+\.\s*/, "") ?? "");
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const styles = creatorMode.isAdult ? ADULT_STYLES : SFW_STYLES;
  const accentColor = creatorMode.isAdult ? "#a855f7" : "#E74C3C";
  const niche = creatorMode.thumbnailNiches.find((n) => n.value === selectedNiche);

  const handleGenerate = () => {
    if (!title.trim()) { toast({ title: "Enter a title", variant: "destructive" }); return; }
    generateConcept.mutate({
      videoTitle: title,
      niche: niche?.promptHint ?? selectedNiche,
      style: `${style} ${creatorMode.isAdult ? "adult creator body-positive" : "creator"}`,
      platform: style,
    });
  };

  const handleGenerateHook = () => {
    if (!title.trim()) { toast({ title: "Enter a title first", variant: "destructive" }); return; }
    generateText.mutate({ videoTitle: title, count: 5 });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "white", fontFamily: "system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, background: "#0a0a1a" }}>
        <Link href="/dashboard">
          <button style={{ background: "none", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ChevronLeft size={14} /> Dashboard
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accentColor}22`, border: `1px solid ${accentColor}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image size={16} color={accentColor} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Thumbnail Generator</div>
            <div style={{ fontSize: 11, color: "#666" }}>
              {creatorMode.isAdult ? "VaultX body-positive thumbnail creation" : "AI-powered thumbnail creation"}
            </div>
          </div>
        </div>
        <CreatorModeSwitcher compact />
      </div>

      {/* Main layout */}
      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, height: "calc(100vh - 65px)" }}>
        {/* Controls panel */}
        <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, overflowY: "auto" }}>
          <div style={{ display: "grid", gap: 16 }}>

            {/* Niche selector — mode-aware */}
            <div>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>
                {creatorMode.isAdult ? "Content Niche" : "Creator Niche"}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {creatorMode.thumbnailNiches.map((n) => (
                  <button
                    key={n.value}
                    onClick={() => setSelectedNiche(n.value)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: `1px solid ${selectedNiche === n.value ? accentColor : "#1a1a2e"}`,
                      background: selectedNiche === n.value ? `${accentColor}20` : "#0a0a1a",
                      cursor: "pointer",
                      fontSize: 11,
                      color: selectedNiche === n.value ? accentColor : "#666",
                      fontWeight: selectedNiche === n.value ? 700 : 400,
                    }}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
                {creatorMode.isAdult ? "Content Title / Drop Name" : "Video Title"}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={creatorMode.isAdult ? "e.g. 'Exclusive Drop — Members Only'" : "Your video title..."}
                style={{ width: "100%", padding: "10px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Hook text with AI generator */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Main Text / Hook
                </label>
                <button
                  onClick={handleGenerateHook}
                  disabled={generateText.isPending}
                  style={{ background: "none", border: `1px solid ${accentColor}44`, borderRadius: 6, padding: "3px 8px", color: accentColor, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Sparkles size={10} /> AI Hook
                </button>
              </div>
              <input
                value={mainText}
                onChange={(e) => setMainText(e.target.value)}
                placeholder={creatorMode.isAdult ? "e.g. 'You won't believe what's inside...'" : "Bold text overlay..."}
                style={{ width: "100%", padding: "10px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Style */}
            <div>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
                {creatorMode.isAdult ? "Visual Style" : "Platform Style"}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {styles.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: `1px solid ${style === s ? accentColor : "#1a1a2e"}`,
                      background: style === s ? `${accentColor}20` : "#0a0a1a",
                      cursor: "pointer",
                      fontSize: 11,
                      color: style === s ? accentColor : "#666",
                      fontWeight: style === s ? 700 : 400,
                      textTransform: "capitalize",
                    }}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div>
              <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
                Mood / Energy
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: `1px solid ${mood === m ? "#C9A84C" : "#1a1a2e"}`,
                      background: mood === m ? "#C9A84C20" : "#0a0a1a",
                      cursor: "pointer",
                      fontSize: 11,
                      color: mood === m ? "#C9A84C" : "#666",
                      fontWeight: mood === m ? 700 : 400,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generateConcept.isPending}
              style={{
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: generateConcept.isPending ? "#1a1a2e" : accentColor,
                color: generateConcept.isPending ? "#555" : "white",
                cursor: generateConcept.isPending ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {generateConcept.isPending
                ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
                : <><Zap size={15} /> Generate Thumbnail Concept</>
              }
            </button>

            {/* Mode info */}
            <div style={{ background: `${accentColor}11`, border: `1px solid ${accentColor}33`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: accentColor, fontWeight: 700, marginBottom: 4 }}>
                {creatorMode.isAdult ? "🔞 VaultX Mode" : "✅ General Creator Mode"}
              </div>
              <div style={{ fontSize: 11, color: "#555", lineHeight: 1.4 }}>
                {creatorMode.isAdult
                  ? "Prompts optimized for body-positive adult creator thumbnails. SFW but desire-grade aesthetic."
                  : "Prompts optimized for standard platform thumbnails. Switch to VaultX mode for adult creator niches."}
              </div>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div style={{ overflowY: "auto" }}>
          {!generated.length ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#444" }}>
              <Image size={48} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No thumbnails yet</div>
              <div style={{ fontSize: 13 }}>Fill in the details and click Generate</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
              {generated.map((item: any, i: number) => (
                <div key={i} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, overflow: "hidden" }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="thumbnail" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
                  ) : (
                    <div style={{ aspectRatio: "16/9", background: `linear-gradient(135deg,${accentColor}22,#0f0f1a)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 8 }}>{item.mainText || title}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{item.style} · {item.mood}</div>
                        <div style={{ fontSize: 10, color: accentColor, marginTop: 4 }}>{item.niche?.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{item.title}</div>
                    {item.concept && (
                      <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5, background: "#0a0a1a", borderRadius: 8, padding: "10px 12px", marginBottom: 10, whiteSpace: "pre-wrap" }}>
                        {item.concept}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      {item.imageUrl && (
                        <a href={item.imageUrl} download style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Download size={12} /> Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}input::placeholder{color:#444}`}</style>
    </div>
  );
}

export default ThumbnailGeneratorUI;
