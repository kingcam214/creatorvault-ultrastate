/**
 * ─── VaultX Render Graph Engine ──────────────────────────────────────────────────
 *
 * A provider-agnostic render instruction system that replaces direct ffmpeg calls
 * for all editor operations. The render graph describes WHAT to produce, not HOW.
 * Provider adapters translate the graph into execution on cloud renderers, AI models,
 * or local processing as appropriate.
 *
 * This is the core mechanic that makes VaultX a world-class editing platform
 * rather than a basic ffmpeg wrapper.
 */

import { randomUUID } from "crypto";

// ─── Render Graph Types ──────────────────────────────────────────────────────────

export type RenderNodeType =
  | "source"          // Input media asset
  | "trim"            // Cut segment from source
  | "concat"          // Join multiple segments
  | "overlay"         // Layer composition (text, image, watermark)
  | "transition"      // Cross-dissolve, wipe, etc.
  | "color_grade"     // Color/look application
  | "audio_mix"       // Audio mixing/ducking
  | "caption"         // Subtitle/caption burn-in
  | "crop"            // Aspect ratio / safe-area crop
  | "speed"           // Time remap / slow motion
  | "ai_enhance"      // AI upscale, denoise, face restore
  | "ai_generate"     // AI video generation (Body Cinema)
  | "watermark"       // Dynamic watermark overlay
  | "thumbnail"       // Extract/generate thumbnail
  | "export";         // Final output specification

export interface RenderNode {
  id: string;
  type: RenderNodeType;
  inputs: string[];   // IDs of upstream nodes
  params: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RenderGraph {
  id: string;
  version: "1.0";
  createdAt: string;
  userId: string;
  projectId?: string;
  nodes: RenderNode[];
  outputNode: string; // ID of the final export node
  constraints: RenderConstraints;
}

export interface RenderConstraints {
  maxDurationSeconds?: number;
  maxResolution?: { width: number; height: number };
  targetPlatform?: PlatformTarget;
  complianceLevel?: "standard" | "adult_verified" | "age_gated";
  watermarkRequired?: boolean;
  budgetCentsMax?: number;
}

export type PlatformTarget =
  | "vaultx_unlock"
  | "vaultx_preview"
  | "onlyfans"
  | "fansly"
  | "telegram"
  | "instagram_reel"
  | "twitter"
  | "tiktok"
  | "youtube_short"
  | "custom";

// ─── Render Graph Builder ────────────────────────────────────────────────────────

export class RenderGraphBuilder {
  private nodes: RenderNode[] = [];
  private userId: string;
  private projectId?: string;
  private constraints: RenderConstraints = {};

  constructor(userId: string, projectId?: string) {
    this.userId = userId;
    this.projectId = projectId;
  }

  private addNode(type: RenderNodeType, inputs: string[], params: Record<string, any>, metadata?: Record<string, any>): string {
    const id = `node_${randomUUID().slice(0, 8)}`;
    this.nodes.push({ id, type, inputs, params, metadata });
    return id;
  }

  source(assetUrl: string, opts?: { duration?: number; mimeType?: string }): string {
    return this.addNode("source", [], { assetUrl, ...opts });
  }

  trim(sourceId: string, startSec: number, endSec: number): string {
    return this.addNode("trim", [sourceId], { startSec, endSec });
  }

  concat(...inputIds: string[]): string {
    return this.addNode("concat", inputIds, { mode: "sequential" });
  }

  overlay(baseId: string, overlayId: string, opts: { x?: number; y?: number; opacity?: number; blendMode?: string; startTime?: number; endTime?: number }): string {
    return this.addNode("overlay", [baseId, overlayId], opts);
  }

  transition(fromId: string, toId: string, type: string, durationSec: number): string {
    return this.addNode("transition", [fromId, toId], { type, durationSec });
  }

  colorGrade(inputId: string, look: string, intensity?: number): string {
    return this.addNode("color_grade", [inputId], { look, intensity: intensity ?? 1.0 });
  }

  audioMix(videoId: string, audioId: string, opts?: { duckLevel?: number; fadeIn?: number; fadeOut?: number }): string {
    return this.addNode("audio_mix", [videoId, audioId], opts || {});
  }

  caption(inputId: string, captions: CaptionEntry[], style?: CaptionStyle): string {
    return this.addNode("caption", [inputId], { captions, style: style || {} });
  }

  crop(inputId: string, aspect: string, safeArea?: boolean): string {
    return this.addNode("crop", [inputId], { aspect, safeArea: safeArea ?? true });
  }

  speed(inputId: string, factor: number): string {
    return this.addNode("speed", [inputId], { factor });
  }

  aiEnhance(inputId: string, operation: "upscale" | "denoise" | "face_restore" | "stabilize", opts?: Record<string, any>): string {
    return this.addNode("ai_enhance", [inputId], { operation, ...opts });
  }

  aiGenerate(inputId: string, opts: AIGenerateParams): string {
    return this.addNode("ai_generate", [inputId], opts);
  }

  watermark(inputId: string, opts: { text?: string; imageUrl?: string; position?: string; opacity?: number }): string {
    return this.addNode("watermark", [inputId], opts);
  }

  thumbnail(inputId: string, opts?: { timeOffset?: number; count?: number }): string {
    return this.addNode("thumbnail", [inputId], opts || {});
  }

  export(inputId: string, opts: ExportParams): string {
    return this.addNode("export", [inputId], opts);
  }

  setConstraints(constraints: RenderConstraints): this {
    this.constraints = { ...this.constraints, ...constraints };
    return this;
  }

  build(): RenderGraph {
    const lastNode = this.nodes[this.nodes.length - 1];
    if (!lastNode) throw new Error("Render graph has no nodes");
    return {
      id: randomUUID(),
      version: "1.0",
      createdAt: new Date().toISOString(),
      userId: this.userId,
      projectId: this.projectId,
      nodes: this.nodes,
      outputNode: lastNode.id,
      constraints: this.constraints,
    };
  }
}

// ─── Supporting Types ────────────────────────────────────────────────────────────

export interface CaptionEntry {
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
}

export interface CaptionStyle {
  font?: string;
  fontSize?: number;
  color?: string;
  background?: string;
  position?: "bottom" | "top" | "center";
  animation?: "none" | "fade" | "word_highlight" | "karaoke";
}

export interface AIGenerateParams {
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  style?: string;
  duration?: number;
  aspectRatio?: string;
  motionDirective?: string;
  referenceImageUrl?: string;
  identityLock?: boolean;
  provider?: string;
}

export interface ExportParams {
  format: "mp4" | "webm" | "mov" | "gif";
  resolution?: { width: number; height: number };
  fps?: number;
  bitrate?: string;
  codec?: string;
  quality?: "draft" | "standard" | "high" | "master";
  platform?: PlatformTarget;
}

// ─── Provider Adapter Interface ──────────────────────────────────────────────────

export type RenderJobStatus = "queued" | "processing" | "rendering" | "complete" | "failed";

export interface RenderJobResult {
  jobId: string;
  status: RenderJobStatus;
  outputUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  costCents?: number;
  providerUsed?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RenderProviderAdapter {
  name: string;
  supportedNodes: RenderNodeType[];
  estimateCost(graph: RenderGraph): number; // cents
  estimateTime(graph: RenderGraph): number; // seconds
  canHandle(graph: RenderGraph): boolean;
  submit(graph: RenderGraph): Promise<RenderJobResult>;
  pollStatus(jobId: string): Promise<RenderJobResult>;
  cancel(jobId: string): Promise<void>;
}

// ─── Provider Registry ───────────────────────────────────────────────────────────

export class RenderProviderRegistry {
  private adapters: RenderProviderAdapter[] = [];

  register(adapter: RenderProviderAdapter): void {
    this.adapters.push(adapter);
  }

  findBest(graph: RenderGraph): RenderProviderAdapter | null {
    const capable = this.adapters.filter(a => a.canHandle(graph));
    if (capable.length === 0) return null;
    // Score by cost efficiency and capability coverage
    capable.sort((a, b) => {
      const costA = a.estimateCost(graph);
      const costB = b.estimateCost(graph);
      const timeA = a.estimateTime(graph);
      const timeB = b.estimateTime(graph);
      // Prefer lower cost, break ties by speed
      if (costA !== costB) return costA - costB;
      return timeA - timeB;
    });
    return capable[0];
  }

  findAll(graph: RenderGraph): RenderProviderAdapter[] {
    return this.adapters.filter(a => a.canHandle(graph));
  }

  getByName(name: string): RenderProviderAdapter | undefined {
    return this.adapters.find(a => a.name === name);
  }
}

// ─── Cloud Render Adapter (replaces ffmpeg for production) ───────────────────────

export class CloudRenderAdapter implements RenderProviderAdapter {
  name = "cloud_render";
  supportedNodes: RenderNodeType[] = ["source", "trim", "concat", "overlay", "transition", "color_grade", "audio_mix", "caption", "crop", "speed", "watermark", "thumbnail", "export"];

  estimateCost(graph: RenderGraph): number {
    // Base cost per node type
    const costs: Record<RenderNodeType, number> = {
      source: 0, trim: 2, concat: 3, overlay: 5, transition: 5,
      color_grade: 8, audio_mix: 4, caption: 3, crop: 2, speed: 4,
      ai_enhance: 50, ai_generate: 200, watermark: 2, thumbnail: 1, export: 10,
    };
    return graph.nodes.reduce((sum, node) => sum + (costs[node.type] || 5), 0);
  }

  estimateTime(graph: RenderGraph): number {
    return graph.nodes.length * 3 + 10; // rough seconds
  }

  canHandle(graph: RenderGraph): boolean {
    return graph.nodes.every(n => this.supportedNodes.includes(n.type));
  }

  async submit(graph: RenderGraph): Promise<RenderJobResult> {
    // In production, this would POST to a cloud render service
    // For now, return a queued job that the polling system will track
    const jobId = `render_${randomUUID().slice(0, 12)}`;
    return { jobId, status: "queued", providerUsed: this.name };
  }

  async pollStatus(jobId: string): Promise<RenderJobResult> {
    return { jobId, status: "processing", providerUsed: this.name };
  }

  async cancel(jobId: string): Promise<void> {
    // Cancel the cloud render job
  }
}

// ─── AI Video Provider Adapter ───────────────────────────────────────────────────

export class AIVideoProviderAdapter implements RenderProviderAdapter {
  name = "ai_video";
  supportedNodes: RenderNodeType[] = ["source", "ai_generate", "ai_enhance", "export"];

  estimateCost(graph: RenderGraph): number {
    const aiNodes = graph.nodes.filter(n => n.type === "ai_generate" || n.type === "ai_enhance");
    return aiNodes.length * 150; // ~$1.50 per AI generation
  }

  estimateTime(graph: RenderGraph): number {
    const aiNodes = graph.nodes.filter(n => n.type === "ai_generate" || n.type === "ai_enhance");
    return aiNodes.length * 60; // ~60s per AI generation
  }

  canHandle(graph: RenderGraph): boolean {
    return graph.nodes.some(n => n.type === "ai_generate" || n.type === "ai_enhance");
  }

  async submit(graph: RenderGraph): Promise<RenderJobResult> {
    const jobId = `ai_${randomUUID().slice(0, 12)}`;
    return { jobId, status: "queued", providerUsed: this.name };
  }

  async pollStatus(jobId: string): Promise<RenderJobResult> {
    return { jobId, status: "processing", providerUsed: this.name };
  }

  async cancel(jobId: string): Promise<void> {}
}

// ─── Graph Validator ─────────────────────────────────────────────────────────────

export function validateRenderGraph(graph: RenderGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map(n => n.id));

  for (const node of graph.nodes) {
    for (const inputId of node.inputs) {
      if (!nodeIds.has(inputId)) {
        errors.push(`Node ${node.id} references non-existent input ${inputId}`);
      }
    }
    if (node.type === "source" && !node.params.assetUrl) {
      errors.push(`Source node ${node.id} missing assetUrl`);
    }
    if (node.type === "trim") {
      if (node.params.startSec >= node.params.endSec) {
        errors.push(`Trim node ${node.id} has invalid time range`);
      }
    }
    if (node.type === "export" && !node.params.format) {
      errors.push(`Export node ${node.id} missing format`);
    }
  }

  if (!nodeIds.has(graph.outputNode)) {
    errors.push(`Output node ${graph.outputNode} not found in graph`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Convenience: Build render graph from timeline state ─────────────────────────

export function timelineToRenderGraph(
  userId: string,
  clips: Array<{ src: string; trimStart: number; trimEnd: number; startOffset: number; type: string }>,
  options: {
    colorGrade?: string;
    watermark?: { text?: string; imageUrl?: string };
    captions?: CaptionEntry[];
    captionStyle?: CaptionStyle;
    platform?: PlatformTarget;
    quality?: "draft" | "standard" | "high" | "master";
    aspectRatio?: string;
  } = {}
): RenderGraph {
  const builder = new RenderGraphBuilder(userId);

  // Create source and trim nodes for each clip
  const trimmedIds: string[] = [];
  for (const clip of clips.filter(c => c.type === "video" || c.type === "image")) {
    const srcId = builder.source(clip.src);
    const trimId = builder.trim(srcId, clip.trimStart, clip.trimEnd);
    trimmedIds.push(trimId);
  }

  // Concatenate all trimmed clips
  let currentId = trimmedIds.length > 1 ? builder.concat(...trimmedIds) : trimmedIds[0];
  if (!currentId) throw new Error("No video clips to render");

  // Apply color grade
  if (options.colorGrade) {
    currentId = builder.colorGrade(currentId, options.colorGrade);
  }

  // Apply aspect ratio crop
  if (options.aspectRatio) {
    currentId = builder.crop(currentId, options.aspectRatio);
  }

  // Apply captions
  if (options.captions && options.captions.length > 0) {
    currentId = builder.caption(currentId, options.captions, options.captionStyle);
  }

  // Apply watermark
  if (options.watermark) {
    currentId = builder.watermark(currentId, { ...options.watermark, position: "bottom-right", opacity: 0.7 });
  }

  // Mix audio tracks
  const audioClips = clips.filter(c => c.type === "audio");
  for (const audioClip of audioClips) {
    const audioSrc = builder.source(audioClip.src, { mimeType: "audio/mpeg" });
    currentId = builder.audioMix(currentId, audioSrc, { duckLevel: 0.3 });
  }

  // Final export
  builder.export(currentId, {
    format: "mp4",
    quality: options.quality || "high",
    platform: options.platform || "vaultx_unlock",
  });

  builder.setConstraints({
    targetPlatform: options.platform || "vaultx_unlock",
    watermarkRequired: !!options.watermark,
  });

  return builder.build();
}
