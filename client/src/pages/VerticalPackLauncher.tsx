/**
 * VERTICAL PACK LAUNCHER
 * 
 * The single-page UI for generating a full vertical pack.
 * Route: /vertical-pack
 * 
 * A creator picks their vertical, fills in 4 fields, hits Generate.
 * One call. Six artifacts. All real.
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";

// ============================================================
// TYPES
// ============================================================

type VerticalId =
  | "YOUTUBE_EDUCATOR"
  | "SHORTFORM_ENTERTAINER"
  | "FITNESS_COACH"
  | "MUSIC_ARTIST"
  | "AGENCY_CONSULTANT"
  | "VAULTX_ADULT_PREMIUM";

type Platform = "youtube" | "tiktok" | "instagram" | "twitter" | "onlyfans" | "fansly";

interface PackArtifact {
  type: string;
  [key: string]: unknown;
}

// ============================================================
// ARTIFACT RENDERERS
// ============================================================

function SocialAuditCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    profiles: Array<{ platform: string; username: string; followers: number; engagementRate: number }>;
    monetizationScore: number;
    topRecommendation: string;
    fullSummary: string;
    verticalFocus: string;
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag">01</span>
        <h3>Social Audit Summary</h3>
      </div>
      <div className="artifact-body">
        {a.profiles?.map((p) => (
          <div key={p.platform} className="stat-row">
            <span className="stat-label">{p.platform.toUpperCase()} @{p.username}</span>
            <span className="stat-value">{p.followers?.toLocaleString()} followers · {p.engagementRate?.toFixed(2)}% eng.</span>
          </div>
        ))}
        <div className="stat-row">
          <span className="stat-label">Monetization Score</span>
          <span className="stat-value score">{a.monetizationScore}/100</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Vertical Focus</span>
          <span className="stat-value">{a.verticalFocus}</span>
        </div>
        <div className="text-block">
          <p className="text-label">Top Recommendation</p>
          <p>{a.topRecommendation}</p>
        </div>
        <div className="text-block">
          <p className="text-label">Full Analysis</p>
          <p className="pre-wrap">{a.fullSummary}</p>
        </div>
      </div>
    </div>
  );
}

function TrailerScriptCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    title: string;
    totalDurationSeconds: number;
    pacingStyle: string;
    segments: Array<{ sceneIndex: number; text: string; visualDescription: string; duration: number }>;
    openingHook: string;
    closingCTA: string;
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag">02</span>
        <h3>Flagship Trailer Script</h3>
      </div>
      <div className="artifact-body">
        <div className="stat-row">
          <span className="stat-label">Title</span>
          <span className="stat-value">{a.title}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Duration</span>
          <span className="stat-value">{a.totalDurationSeconds}s · {a.pacingStyle}</span>
        </div>
        <div className="text-block">
          <p className="text-label">Opening Hook</p>
          <p className="hook-text">{a.openingHook}</p>
        </div>
        <div className="segments-list">
          {a.segments?.map((seg) => (
            <div key={seg.sceneIndex} className="segment-row">
              <span className="seg-num">Scene {seg.sceneIndex + 1}</span>
              <div className="seg-content">
                <p className="seg-text">{seg.text}</p>
                <p className="seg-visual">📷 {seg.visualDescription}</p>
                <span className="seg-dur">{seg.duration}s</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-block">
          <p className="text-label">Closing CTA</p>
          <p className="cta-text">{a.closingCTA}</p>
        </div>
      </div>
    </div>
  );
}

function TeaserClipsCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    clips: Array<{ clipNumber: number; title: string; durationSeconds: number; hook: string; body: string; cta: string; platform: string }>;
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag">03</span>
        <h3>Short Teaser Clips (×{a.clips?.length})</h3>
      </div>
      <div className="artifact-body">
        {a.clips?.map((clip) => (
          <div key={clip.clipNumber} className="clip-block">
            <div className="clip-header">
              <span className="clip-num">Clip {clip.clipNumber}</span>
              <span className="clip-meta">{clip.durationSeconds}s · {clip.platform}</span>
            </div>
            <p className="clip-title">{clip.title}</p>
            <div className="clip-parts">
              <div className="clip-part">
                <span className="part-label">HOOK</span>
                <p>{clip.hook}</p>
              </div>
              <div className="clip-part">
                <span className="part-label">BODY</span>
                <p>{clip.body}</p>
              </div>
              <div className="clip-part">
                <span className="part-label">CTA</span>
                <p>{clip.cta}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchDeckCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    deckTitle: string;
    slideCount: number;
    slides: Array<{ slideNumber: number; title: string; headline: string; bodyPoints: string[]; visualNote: string }>;
    colorScheme: string;
    toneLabel: string;
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag">04</span>
        <h3>Launch Deck</h3>
      </div>
      <div className="artifact-body">
        <div className="stat-row">
          <span className="stat-label">Title</span>
          <span className="stat-value">{a.deckTitle}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Slides</span>
          <span className="stat-value">{a.slideCount} · {a.toneLabel} · {a.colorScheme}</span>
        </div>
        <div className="slides-list">
          {a.slides?.map((slide) => (
            <div key={slide.slideNumber} className="slide-row">
              <div className="slide-num">{slide.slideNumber}</div>
              <div className="slide-content">
                <p className="slide-title">{slide.title}</p>
                <p className="slide-headline">{slide.headline}</p>
                <ul className="slide-points">
                  {slide.bodyPoints?.map((pt, i) => <li key={i}>{pt}</li>)}
                </ul>
                <p className="slide-visual">📷 {slide.visualNote}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LandingPageCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    heroHeadline: string;
    subheadline: string;
    bullets: string[];
    ctaText: string;
    socialProofLine: string;
    fullCopyBlock: string;
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag">05</span>
        <h3>Landing Page Copy Block</h3>
      </div>
      <div className="artifact-body">
        <div className="text-block hero-block">
          <p className="hero-headline">{a.heroHeadline}</p>
          <p className="hero-sub">{a.subheadline}</p>
        </div>
        <div className="bullets-block">
          {a.bullets?.map((b, i) => <p key={i} className="bullet-line">{b}</p>)}
        </div>
        <div className="stat-row">
          <span className="stat-label">CTA Button</span>
          <span className="stat-value cta-btn">{a.ctaText}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Social Proof</span>
          <span className="stat-value">{a.socialProofLine}</span>
        </div>
        <div className="text-block">
          <p className="text-label">Full Copy Block</p>
          <p className="pre-wrap">{a.fullCopyBlock}</p>
        </div>
      </div>
    </div>
  );
}

function DMEmailCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    dmScript: string;
    emailSubject: string;
    emailBody: string;
    followUpDM: string;
  };

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag">06</span>
        <h3>DM / Email Script</h3>
      </div>
      <div className="artifact-body">
        <div className="text-block">
          <p className="text-label">DM Script</p>
          <p className="pre-wrap">{a.dmScript}</p>
        </div>
        <div className="text-block">
          <p className="text-label">Email Subject</p>
          <p className="email-subject">{a.emailSubject}</p>
        </div>
        <div className="text-block">
          <p className="text-label">Email Body</p>
          <p className="pre-wrap">{a.emailBody}</p>
        </div>
        <div className="text-block">
          <p className="text-label">48hr Follow-Up DM</p>
          <p className="pre-wrap follow-up">{a.followUpDM}</p>
        </div>
      </div>
    </div>
  );
}

function PlatformStrategyCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    primaryPlatform: string;
    secondaryPlatforms: string[];
    contentMix: Array<{ contentType: string; frequency: string; purpose: string }>;
    funnelMap: string;
    growthTactics: string[];
    platformRules: string[];
  };
  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag" style={{ background: "#be185d" }}>04</span>
        <h3>Platform Strategy</h3>
      </div>
      <div className="artifact-body">
        <div className="stat-row">
          <span className="stat-label">Primary Platform</span>
          <span className="stat-value">{a.primaryPlatform}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Secondary Platforms</span>
          <span className="stat-value">{a.secondaryPlatforms?.join(" · ")}</span>
        </div>
        <div className="text-block">
          <p className="text-label">Funnel Map</p>
          <p className="pre-wrap">{a.funnelMap}</p>
        </div>
        <div className="text-block">
          <p className="text-label">Content Mix</p>
          {a.contentMix?.map((c, i) => (
            <div key={i} className="segment-row" style={{ marginBottom: 8 }}>
              <div className="seg-content">
                <p className="seg-text">{c.contentType}</p>
                <p className="seg-visual">{c.frequency} · {c.purpose}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-block">
          <p className="text-label">Growth Tactics</p>
          {a.growthTactics?.map((t, i) => <p key={i} className="bullet-line">→ {t}</p>)}
        </div>
        <div className="text-block">
          <p className="text-label">Platform Rules</p>
          {a.platformRules?.map((r, i) => <p key={i} className="bullet-line" style={{ color: "#f87171" }}>✗ {r}</p>)}
        </div>
      </div>
    </div>
  );
}

function ContentCalendarCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    monthlyTheme: string;
    contentPillars: string[];
    postingFrequency: string;
    weeklySchedule: Array<{ day: string; contentType: string; platform: string; hook: string; goal: string }>;
  };
  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag" style={{ background: "#be185d" }}>05</span>
        <h3>Content Calendar</h3>
      </div>
      <div className="artifact-body">
        <div className="stat-row">
          <span className="stat-label">Monthly Theme</span>
          <span className="stat-value">{a.monthlyTheme}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Posting Frequency</span>
          <span className="stat-value">{a.postingFrequency}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Content Pillars</span>
          <span className="stat-value">{a.contentPillars?.join(" · ")}</span>
        </div>
        <div className="text-block">
          <p className="text-label">7-Day Schedule</p>
          {a.weeklySchedule?.map((day, i) => (
            <div key={i} className="segment-row" style={{ marginBottom: 8 }}>
              <div className="seg-num">{day.day}</div>
              <div className="seg-content">
                <p className="seg-text">{day.contentType} · {day.platform}</p>
                <p className="seg-visual">Hook: {day.hook}</p>
                <p className="seg-dur">Goal: {day.goal}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonetizationRoadmapCard({ artifact }: { artifact: PackArtifact }) {
  const a = artifact as {
    type: string;
    currentMonthlyEstimate: string;
    revenueStreams: Array<{ stream: string; currentStatus: string; targetMonthly: string; actionToActivate: string }>;
    thirtyDayPlan: string[];
    ninetyDayTarget: string;
    keyLeverage: string;
  };
  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <span className="artifact-tag" style={{ background: "#be185d" }}>08</span>
        <h3>Monetization Roadmap</h3>
      </div>
      <div className="artifact-body">
        <div className="stat-row">
          <span className="stat-label">Current MRR Estimate</span>
          <span className="stat-value score">{a.currentMonthlyEstimate}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">90-Day Target</span>
          <span className="stat-value" style={{ color: "#4ade80" }}>{a.ninetyDayTarget}</span>
        </div>
        <div className="text-block">
          <p className="text-label">Key Leverage This Week</p>
          <p className="pre-wrap" style={{ color: "#fbbf24", fontWeight: 600 }}>{a.keyLeverage}</p>
        </div>
        <div className="text-block">
          <p className="text-label">Revenue Streams</p>
          {a.revenueStreams?.map((s, i) => (
            <div key={i} className="segment-row" style={{ marginBottom: 8 }}>
              <div className="seg-content">
                <p className="seg-text">{s.stream} · <span style={{ color: s.currentStatus === "Active" ? "#4ade80" : "#f87171" }}>{s.currentStatus}</span></p>
                <p className="seg-visual">Target: {s.targetMonthly}</p>
                <p className="seg-dur">→ {s.actionToActivate}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-block">
          <p className="text-label">30-Day Action Plan</p>
          {a.thirtyDayPlan?.map((action, i) => <p key={i} className="bullet-line">✓ {action}</p>)}
        </div>
      </div>
    </div>
  );
}

function ArtifactRenderer({ artifact }: { artifact: PackArtifact }) {
  switch (artifact.type) {
    case "SOCIAL_AUDIT_SUMMARY": return <SocialAuditCard artifact={artifact} />;
    case "FLAGSHIP_TRAILER": return <TrailerScriptCard artifact={artifact} />;
    case "SHORT_TEASER_CLIPS": return <TeaserClipsCard artifact={artifact} />;
    case "LAUNCH_DECK": return <LaunchDeckCard artifact={artifact} />;
    case "LANDING_PAGE_BLOCK": return <LandingPageCard artifact={artifact} />;
    case "DM_EMAIL_SCRIPT": return <DMEmailCard artifact={artifact} />;
    case "PLATFORM_STRATEGY": return <PlatformStrategyCard artifact={artifact} />;
    case "CONTENT_CALENDAR": return <ContentCalendarCard artifact={artifact} />;
    case "MONETIZATION_ROADMAP": return <MonetizationRoadmapCard artifact={artifact} />;
    default: return (
      <div className="artifact-card">
        <div className="artifact-header"><h3>{artifact.type}</h3></div>
        <div className="artifact-body"><pre>{JSON.stringify(artifact, null, 2)}</pre></div>
      </div>
    );
  }
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function VerticalPackLauncher() {
  const { user } = useAuth();
  const [selectedVertical, setSelectedVertical] = useState<VerticalId>("YOUTUBE_EDUCATOR");
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [handle, setHandle] = useState("");
  const [courseTopic, setCourseTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [pricePoint, setPricePoint] = useState("");
  const [credibilityProof, setCredibilityProof] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAssetItem[]>([]);
  const [lastTrailerProjectId, setLastTrailerProjectId] = useState<string | null>(null);
  const [trailerProjectError, setTrailerProjectError] = useState<string | null>(null);
  const [packResult, setPackResult] = useState<{
    packId: string;
    packName: string;
    artifacts: PackArtifact[];
    errors: string[];
    artifactCount: number;
  } | null>(null);

  const { data: verticals } = trpc.verticalPack.listVerticals.useQuery();
  const selectedMediaIds = useMemo(() => selectedMedia.map((asset) => asset.id), [selectedMedia]);

  const createTrailerProjectMutation = trpc.mediaAssets.createTrailerProject.useMutation({
    onSuccess: (data) => {
      setLastTrailerProjectId(data.trailerProjectId);
      setTrailerProjectError(null);
    },
    onError: (error) => {
      setTrailerProjectError(error.message);
    },
  });

  const generateMutation = trpc.verticalPack.generatePack.useMutation({
    onSuccess: (data) => {
      setPackResult(data as typeof packResult);
    },
  });

  const handleGenerate = () => {
    if (!handle.trim()) return;
    generateMutation.mutate({
      verticalId: selectedVertical,
      creatorHandle: handle.trim().replace(/^@/, ""),
      platform,
      courseTopic: courseTopic || undefined,
      targetAudience: targetAudience || undefined,
      pricePoint: pricePoint || undefined,
      credibilityProof: credibilityProof || undefined,
    });
  };

  const isLoading = generateMutation.isPending;

  const handleCreateTrailerProject = () => {
    if (!packResult || selectedMediaIds.length === 0) return;

    const trailerArtifact = packResult.artifacts.find((artifact) => artifact.type === "FLAGSHIP_TRAILER") as
      | {
          title?: string;
          openingHook?: string;
          closingCTA?: string;
          segments?: Array<{ text?: string; visualDescription?: string; duration?: number }>;
        }
      | undefined;

    const hooks = [trailerArtifact?.openingHook, trailerArtifact?.closingCTA].filter(Boolean) as string[];
    const scriptText = trailerArtifact?.segments?.map((segment) => segment.text ?? "").join("\n") ?? "";

    createTrailerProjectMutation.mutate({
      projectName: `${handle.trim().replace(/^@/, "") || "creator"} - ${selectedVertical.toLowerCase()} trailer`,
      projectType: "launch_trailer",
      format: "16:9",
      title: trailerArtifact?.title,
      concept: courseTopic || undefined,
      scriptText: scriptText || undefined,
      selectedAssetIds: selectedMediaIds,
      segments: trailerArtifact?.segments?.map((segment, idx) => ({
        sceneIndex: idx,
        text: segment.text ?? "",
        visualDescription: segment.visualDescription,
        duration: segment.duration,
      })),
      hooks,
    });
  };

  return (
    <div className="vpl-root">
      <style>{`
        .vpl-root {
          min-height: 100vh;
          background: #0a0a0a;
          color: #f0f0f0;
          font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
          padding: 0;
        }
        .vpl-header {
          background: linear-gradient(135deg, #1a0a2e 0%, #0d1117 100%);
          border-bottom: 1px solid #2a1a4e;
          padding: 32px 40px 24px;
        }
        .vpl-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 4px;
          letter-spacing: -0.5px;
        }
        .vpl-header p {
          font-size: 14px;
          color: #888;
          margin: 0;
        }
        .vpl-body {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }
        .vpl-form {
          background: #111;
          border: 1px solid #222;
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 40px;
        }
        .vpl-form h2 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 24px;
        }
        .vertical-selector {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 28px;
        }
        .vertical-btn {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 14px 16px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .vertical-btn:hover {
          border-color: #7c3aed;
          background: #1e1030;
        }
        .vertical-btn.active {
          border-color: #7c3aed;
          background: #1e1030;
          box-shadow: 0 0 0 1px #7c3aed;
        }
        .vertical-btn .v-name {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          display: block;
          margin-bottom: 4px;
        }
        .vertical-btn .v-status {
          font-size: 11px;
          color: #666;
        }
        .vertical-btn.active .v-status {
          color: #a78bfa;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-group input, .form-group select {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .form-group input:focus, .form-group select:focus {
          border-color: #7c3aed;
        }
        .form-group input::placeholder {
          color: #555;
        }
        .generate-btn {
          width: 100%;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border: none;
          border-radius: 8px;
          padding: 16px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s;
          letter-spacing: 0.3px;
        }
        .generate-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading-state {
          text-align: center;
          padding: 60px;
          color: #888;
        }
        .loading-state .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #333;
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state h3 {
          font-size: 18px;
          color: #fff;
          margin: 0 0 8px;
        }
        .loading-state p {
          font-size: 14px;
          margin: 0;
        }
        .pack-result {
          margin-top: 0;
        }
        .pack-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid #222;
        }
        .pack-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        .pack-meta {
          font-size: 13px;
          color: #888;
          margin: 4px 0 0;
        }
        .pack-badge {
          background: #1a2a1a;
          border: 1px solid #2a4a2a;
          border-radius: 20px;
          padding: 6px 16px;
          font-size: 13px;
          color: #4ade80;
          font-weight: 600;
        }
        .errors-block {
          background: #1a0a0a;
          border: 1px solid #4a1a1a;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .errors-block h4 {
          font-size: 13px;
          color: #f87171;
          margin: 0 0 8px;
        }
        .errors-block ul {
          margin: 0;
          padding-left: 16px;
        }
        .errors-block li {
          font-size: 13px;
          color: #f87171;
          margin-bottom: 4px;
        }
        .artifacts-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .artifact-card {
          background: #111;
          border: 1px solid #222;
          border-radius: 12px;
          overflow: hidden;
        }
        .artifact-header {
          background: #1a1a2e;
          border-bottom: 1px solid #222;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .artifact-tag {
          background: #7c3aed;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .artifact-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .artifact-body {
          padding: 24px;
        }
        .stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #1a1a1a;
        }
        .stat-row:last-child { border-bottom: none; }
        .stat-label {
          font-size: 12px;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-value {
          font-size: 14px;
          color: #e0e0e0;
          font-weight: 500;
          text-align: right;
          max-width: 60%;
        }
        .stat-value.score {
          color: #4ade80;
          font-weight: 700;
          font-size: 16px;
        }
        .stat-value.cta-btn {
          background: #7c3aed;
          color: #fff;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 700;
        }
        .text-block {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #1a1a1a;
        }
        .text-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          margin: 0 0 8px;
        }
        .pre-wrap {
          white-space: pre-wrap;
          font-size: 14px;
          color: #ccc;
          line-height: 1.6;
          margin: 0;
        }
        .hook-text {
          font-size: 16px;
          color: #fff;
          font-weight: 600;
          font-style: italic;
          margin: 0;
        }
        .cta-text {
          font-size: 15px;
          color: #a78bfa;
          font-weight: 700;
          margin: 0;
        }
        .segments-list {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .segment-row {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #1a1a1a;
          border-radius: 8px;
        }
        .seg-num {
          font-size: 11px;
          color: #7c3aed;
          font-weight: 700;
          white-space: nowrap;
          padding-top: 2px;
        }
        .seg-content { flex: 1; }
        .seg-text { font-size: 14px; color: #e0e0e0; margin: 0 0 4px; }
        .seg-visual { font-size: 12px; color: #666; margin: 0 0 4px; }
        .seg-dur { font-size: 11px; color: #555; }
        .clip-block {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .clip-block:last-child { margin-bottom: 0; }
        .clip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .clip-num {
          font-size: 12px;
          font-weight: 700;
          color: #7c3aed;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .clip-meta { font-size: 12px; color: #555; }
        .clip-title { font-size: 14px; font-weight: 600; color: #fff; margin: 0 0 12px; }
        .clip-parts { display: flex; flex-direction: column; gap: 10px; }
        .clip-part { }
        .part-label {
          font-size: 10px;
          font-weight: 700;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 3px;
        }
        .clip-part p { font-size: 13px; color: #ccc; margin: 0; }
        .slides-list { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
        .slide-row {
          display: flex;
          gap: 16px;
          padding: 12px;
          background: #1a1a1a;
          border-radius: 8px;
        }
        .slide-num {
          font-size: 20px;
          font-weight: 800;
          color: #333;
          min-width: 32px;
          text-align: center;
          padding-top: 2px;
        }
        .slide-content { flex: 1; }
        .slide-title { font-size: 11px; color: #7c3aed; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; }
        .slide-headline { font-size: 15px; font-weight: 700; color: #fff; margin: 0 0 8px; }
        .slide-points { margin: 0 0 8px; padding-left: 16px; }
        .slide-points li { font-size: 13px; color: #ccc; margin-bottom: 3px; }
        .slide-visual { font-size: 12px; color: #555; margin: 0; }
        .hero-block { border: none; margin-top: 0; padding-top: 0; }
        .hero-headline { font-size: 24px; font-weight: 800; color: #fff; margin: 0 0 8px; line-height: 1.2; }
        .hero-sub { font-size: 15px; color: #aaa; margin: 0; }
        .bullets-block { margin: 16px 0; }
        .bullet-line { font-size: 14px; color: #ccc; margin: 0 0 6px; }
        .email-subject { font-size: 15px; font-weight: 600; color: #fff; margin: 0; }
        .follow-up { color: #a78bfa; }
        .reset-btn {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 8px 16px;
          color: #888;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .reset-btn:hover { border-color: #555; color: #fff; }
        .auth-gate {
          text-align: center;
          padding: 80px 40px;
        }
        .auth-gate h2 { font-size: 24px; color: #fff; margin: 0 0 12px; }
        .auth-gate p { font-size: 15px; color: #888; }
      `}</style>

      <div className="vpl-header">
        <h1>Vertical Pack Launcher</h1>
        <p>One vertical. One call. Six artifacts. All real.</p>
      </div>

      <div className="vpl-body">
        {!user ? (
          <div className="auth-gate">
            <h2>Sign in to generate your pack</h2>
            <p>You need to be logged in to run the Vertical Pack Launcher.</p>
          </div>
        ) : packResult ? (
          <div className="pack-result">
            <div className="pack-header">
              <div>
                <h2>{packResult.packName}</h2>
                <p className="pack-meta">@{handle} · {packResult.artifactCount} artifacts generated</p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="pack-badge">{packResult.artifactCount} Artifacts Ready</span>
                <button className="reset-btn" onClick={() => setPackResult(null)}>← New Pack</button>
              </div>
            </div>

            {packResult.errors.length > 0 && (
              <div className="errors-block">
                <h4>⚠ {packResult.errors.length} artifact(s) failed</h4>
                <ul>
                  {packResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div className="artifacts-grid">
              {packResult.artifacts.map((artifact, i) => (
                <ArtifactRenderer key={i} artifact={artifact} />
              ))}
            </div>

            <div style={{ marginTop: 24, background: "#101010", border: "1px solid #242424", borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: "0 0 8px", color: "#f5f0e8" }}>Create Trailer Project</h3>
              <p style={{ margin: "0 0 12px", color: "#9a9a9a", fontSize: 13 }}>
                Use your selected media + generated flagship trailer script to create a row in trailer_projects.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  style={{ borderRadius: 8, border: "1px solid #c9a84c", background: "rgba(201,168,76,0.12)", color: "#c9a84c", padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Select Media ({selectedMedia.length})
                </button>
                <button
                  type="button"
                  onClick={handleCreateTrailerProject}
                  disabled={selectedMedia.length === 0 || createTrailerProjectMutation.isPending}
                  style={{ borderRadius: 8, border: "1px solid #c9a84c", background: selectedMedia.length === 0 ? "#4f4533" : "#c9a84c", color: "#111", padding: "8px 12px", fontWeight: 800, cursor: selectedMedia.length === 0 ? "not-allowed" : "pointer" }}
                >
                  {createTrailerProjectMutation.isPending ? "Creating..." : "Create trailer_projects row"}
                </button>
              </div>

              {lastTrailerProjectId && (
                <p style={{ margin: "10px 0 0", color: "#4ade80", fontSize: 13 }}>
                  Trailer project created: {lastTrailerProjectId}
                </p>
              )}
              {trailerProjectError && (
                <p style={{ margin: "10px 0 0", color: "#f87171", fontSize: 13 }}>
                  {trailerProjectError}
                </p>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <h3>Generating your pack...</h3>
            <p>Running all artifacts in parallel. This takes 30–90 seconds.</p>
          </div>
        ) : (
          <div className="vpl-form">
            <h2>Select Your Vertical</h2>

            <div className="vertical-selector">
              {(verticals ?? [
                { id: "YOUTUBE_EDUCATOR", displayName: "YouTube Educator", packName: "YouTube Educator Launch Pack v1", status: "ACTIVE" },
                { id: "VAULTX_ADULT_PREMIUM", displayName: "VaultX Adult Premium Creator", packName: "VaultX Adult Creator Launch Pack v1", status: "ACTIVE" },
                { id: "SHORTFORM_ENTERTAINER", displayName: "Short-Form Entertainer", packName: "Short-Form Entertainer Pack v1", status: "PENDING" },
                { id: "FITNESS_COACH", displayName: "Fitness Coach", packName: "Fitness Coach Launch Pack v1", status: "PENDING" },
                { id: "MUSIC_ARTIST", displayName: "Music Artist", packName: "Music Artist Launch Pack v1", status: "PENDING" },
                { id: "AGENCY_CONSULTANT", displayName: "Agency / Consultant", packName: "Agency Launch Pack v1", status: "PENDING" },
              ]).map((v) => (
                <button
                  key={v.id}
                  className={`vertical-btn ${selectedVertical === v.id ? "active" : ""}`}
                  onClick={() => setSelectedVertical(v.id as VerticalId)}
                >
                  <span className="v-name">{v.displayName}</span>
                  <span className="v-status">{(v as { status: string }).status === "ACTIVE" ? "✓ Active" : "Coming soon"}</span>
                </button>
              ))}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Creator Handle *</label>
                <input
                  type="text"
                  placeholder="@yourhandle (no @)"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Primary Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="onlyfans">OnlyFans</option>
                  <option value="fansly">Fansly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Course / Content Topic</label>
                <input
                  type="text"
                  placeholder="e.g. YouTube growth for beginners"
                  value={courseTopic}
                  onChange={(e) => setCourseTopic(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <input
                  type="text"
                  placeholder="e.g. aspiring YouTubers with 0–1k subs"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Price Point</label>
                <input
                  type="text"
                  placeholder="e.g. $297, Free + upsell, $97/mo"
                  value={pricePoint}
                  onChange={(e) => setPricePoint(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Your Biggest Proof / Result</label>
                <input
                  type="text"
                  placeholder="e.g. Grew from 0 to 100k in 6 months"
                  value={credibilityProof}
                  onChange={(e) => setCredibilityProof(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18, border: "1px solid #2b2b2b", borderRadius: 10, padding: 14, background: "#121212" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Trailer Media Selection
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#aaa", fontSize: 13 }}>
                    Choose media clips/images now so your trailer project can be created right after artifacts generate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #c9a84c",
                    color: "#c9a84c",
                    background: "rgba(201,168,76,0.12)",
                    padding: "8px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Select Media ({selectedMedia.length})
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                {selectedMedia.slice(0, 8).map((asset) => (
                  <div key={asset.id} style={{ border: "1px solid #2a2a2a", borderRadius: 8, overflow: "hidden", background: "#0f0f0f" }}>
                    {(asset.thumbnailUrl ?? asset.publicUrl) ? (
                      <img src={asset.thumbnailUrl ?? asset.publicUrl ?? ""} alt={asset.fileName} style={{ width: "100%", height: 64, objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: 64, display: "grid", placeItems: "center", color: "#666", fontSize: 11 }}>No preview</div>
                    )}
                    <div style={{ padding: "4px 6px", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {asset.fileName}
                    </div>
                  </div>
                ))}
                {selectedMedia.length === 0 && <p style={{ margin: 0, color: "#777", fontSize: 12 }}>No media selected yet.</p>}
              </div>
            </div>

            {generateMutation.isError && (
              <div className="errors-block" style={{ marginBottom: 16 }}>
                <h4>Error</h4>
                <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>
                  {generateMutation.error?.message ?? "Something went wrong. Try again."}
                </p>
              </div>
            )}

            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={!handle.trim() || isLoading}
            >
              Generate Full Pack — 6 Artifacts
            </button>
          </div>
        )}
      </div>
      <MediaPicker
        open={showMediaPicker}
        mode="multi"
        title="Select Media for Trailer + Teasers"
        subtitle="Choose the clips and images that should feed your trailer scenes"
        initialSelectedIds={selectedMediaIds}
        onClose={() => setShowMediaPicker(false)}
        onConfirm={(selected) => {
          setSelectedMedia(selected);
          setShowMediaPicker(false);
        }}
      />
    </div>
  );
}