/**
 * CreatorVault Remotion Root
 * Registers ALL compositions — legacy MotionFlyer, Visual DNA, and 3D Empire
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { MotionFlyerComposition } from "./compositions/MotionFlyerComposition";
import type { RenderContract } from "./types";
import {
  VisualDNAPortrait,
  VisualDNALandscape,
  VisualDNAThumbnail,
  VisualDNABroll,
  VisualDNATitleCard,
  type VisualDNAProps,
} from "./VisualDNAComposition";
import { EpisodeTrailerComposition, type EpisodeTrailerProps } from "./compositions/EpisodeTrailerComposition";
import { EmpireMapSnapshotComposition, type EmpireMapSnapshotProps } from "./compositions/EmpireMapSnapshotComposition";

const defaultRenderContract: RenderContract = {
  jobId: "preview",
  mode: "flyer",
  baseImagePath: "",
  baseImageUrl: "",
  width: 1080,
  height: 1920,
  fps: 30,
  durationSeconds: 10,
  motionPreset: "neon_pulse",
  premiumMode: false,
  cinematicMode: false,
  artistName: "CreatorVault",
  songTitle: "Empire",
  subtitle: "Built by a creator, for creators.",
  textPreset: "slide_up",
  accentColor: "00D9FF",
  textColor: "FFFFFF",
  fontFamily: "BebasNeue",
};

const defaultVisualDNA: VisualDNAProps = {
  headline: "CREATORVAULT",
  subline: "EMPIRE",
  tagline: "Built by a creator, for creators.",
  accentColor: "#00D9FF",
  secondaryColor: "#D4AF37",
  showParticles: true,
  showGrid: true,
  showGodRays: true,
  showScanLine: true,
  mode: "flyer",
};

const defaultEpisodeTrailer: EpisodeTrailerProps = {
  episodeId: "preview",
  title: "BIENVENIDO AL VAULT",
  playlistLabel: "Día Uno 🌅",
  thumbnailEmoji: "🌅",
  ctaLabel: "Empezar el Vault",
  views: 312,
  estimatedRevenue: 0,
  glowScore: 0.6,
  accentColor: "#00D9FF",
  duration: "4:30",
};

const defaultEmpireMap: EmpireMapSnapshotProps = {
  kingName: "KingCam",
  creatorNodes: [
    { id: 14, name: "Emma", emoji: "💪", type: "creator", ring: 1, color: "#a78bfa", powerScore: 75, metric: "Active" },
    { id: 2, name: "Creator", emoji: "🎵", type: "creator", ring: 1, color: "#22d3ee", powerScore: 40, metric: "Active" },
  ],
  systemNodes: [
    { id: "videolab", name: "VideoLab", emoji: "🎬", type: "system", ring: 2, color: "#00D9FF", powerScore: 65, metric: "Active" },
    { id: "emma-engine", name: "Emma Engine", emoji: "🤖", type: "system", ring: 2, color: "#a78bfa", powerScore: 60, metric: "Active" },
    { id: "command-center", name: "Command", emoji: "👑", type: "system", ring: 2, color: "#D4AF37", powerScore: 90, metric: "Active" },
  ],
  totalRevenue: 0,
  totalJobs: 0,
  accentColor: "#00D9FF",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── LEGACY MOTION FLYER COMPOSITIONS ── */}
      <Composition id="MotionFlyerPortrait" component={MotionFlyerComposition} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={defaultRenderContract} />
      <Composition id="MotionFlyerSquare" component={MotionFlyerComposition} durationInFrames={300} fps={30} width={1080} height={1080} defaultProps={{ ...defaultRenderContract, width: 1080, height: 1080 }} />
      <Composition id="MotionFlyerLandscape" component={MotionFlyerComposition} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{ ...defaultRenderContract, width: 1920, height: 1080 }} />
      <Composition id="AlbumCoverSquare" component={MotionFlyerComposition} durationInFrames={300} fps={30} width={1080} height={1080} defaultProps={{ ...defaultRenderContract, mode: "album_cover", width: 1080, height: 1080 }} />
      <Composition id="AlbumCoverPortrait" component={MotionFlyerComposition} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={{ ...defaultRenderContract, mode: "album_cover" }} />

      {/* ── VISUAL DNA COMPOSITIONS ── */}
      <Composition id="VisualDNAPortrait" component={VisualDNAPortrait} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={defaultVisualDNA} />
      <Composition id="VisualDNASquare" component={VisualDNAPortrait} durationInFrames={300} fps={30} width={1080} height={1080} defaultProps={{ ...defaultVisualDNA, mode: "flyer" }} />
      <Composition id="VisualDNALandscape" component={VisualDNALandscape} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{ ...defaultVisualDNA, headline: "CREATORVAULT EMPIRE", subline: "The World's Most Powerful Creator OS" }} />
      <Composition id="VisualDNAThumbnail" component={VisualDNAThumbnail} durationInFrames={90} fps={30} width={1280} height={720} defaultProps={{ ...defaultVisualDNA, headline: "EMPIRE", subline: "CREATORVAULT", mode: "thumbnail" }} />
      <Composition id="VisualDNABroll" component={VisualDNABroll} durationInFrames={150} fps={30} width={1920} height={1080} defaultProps={{ ...defaultVisualDNA, headline: "CREATORVAULT", mode: "broll" }} />
      <Composition id="VisualDNATitleCard" component={VisualDNATitleCard} durationInFrames={210} fps={30} width={1920} height={1080} defaultProps={{ ...defaultVisualDNA, headline: "THE LION'S DEN", subline: "Season 1", tagline: "CreatorVault Studios", accentColor: "#D4AF37", mode: "title_card" }} />

      {/* ── 3D EMPIRE COMPOSITIONS ── */}
      <Composition id="EpisodeTrailer" component={EpisodeTrailerComposition} durationInFrames={450} fps={30} width={1080} height={1920} defaultProps={defaultEpisodeTrailer} />
      <Composition id="EmpireMapSnapshot" component={EmpireMapSnapshotComposition} durationInFrames={360} fps={30} width={1920} height={1080} defaultProps={defaultEmpireMap} />
    </>
  );
};

registerRoot(RemotionRoot);
