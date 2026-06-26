/**
 * Render Graph tRPC Router — timeline-to-render-graph pipeline
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { RenderGraphBuilder, validateRenderGraph, timelineToRenderGraph, RenderProviderRegistry, CloudRenderAdapter, AIVideoProviderAdapter } from "../services/renderGraph";

const registry = new RenderProviderRegistry();
registry.register(new CloudRenderAdapter());
registry.register(new AIVideoProviderAdapter());

export const renderGraphRouter = router({
  buildFromTimeline: protectedProcedure.input(z.object({
    clips: z.array(z.object({
      src: z.string(),
      trimStart: z.number(),
      trimEnd: z.number(),
      startOffset: z.number(),
      type: z.string(),
    })),
    colorGrade: z.string().optional(),
    watermarkText: z.string().optional(),
    platform: z.string().optional(),
    quality: z.enum(["draft", "standard", "high", "master"]).default("high"),
    aspectRatio: z.string().optional(),
  })).mutation(({ ctx, input }) => {
    const graph = timelineToRenderGraph(String(ctx.user.id), input.clips as any, {
      colorGrade: input.colorGrade,
      watermark: input.watermarkText ? { text: input.watermarkText } : undefined,
      platform: input.platform as any,
      quality: input.quality,
      aspectRatio: input.aspectRatio,
    });
    const validation = validateRenderGraph(graph);
    return { graph, validation };
  }),

  validate: protectedProcedure.input(z.object({
    graph: z.any(),
  })).query(({ input }) => {
    return validateRenderGraph(input.graph);
  }),

  submit: protectedProcedure.input(z.object({
    graph: z.any(),
  })).mutation(async ({ input }) => {
    const graph = input.graph;
    const validation = validateRenderGraph(graph);
    if (!validation.valid) return { error: "Invalid graph", details: validation.errors };
    const provider = registry.findBest(graph);
    if (!provider) return { error: "No provider available" };
    const result = await provider.submit(graph);
    return result;
  }),

  estimateCost: protectedProcedure.input(z.object({
    graph: z.any(),
  })).query(({ input }) => {
    const providers = registry.findAll(input.graph);
    return providers.map(p => ({ provider: p.name, costCents: p.estimateCost(input.graph), timeSec: p.estimateTime(input.graph) }));
  }),
});
