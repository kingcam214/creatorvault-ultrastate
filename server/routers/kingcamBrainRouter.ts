import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import { invokeLLM } from "../_core/llm";
import { getKingcamCloneOperatingSystem } from "../services/kingcamCloneOperatingSystemService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const KINGCAM_OWNER_IDS = new Set([6, 33]);

function ownerOnly(userId: number): void {
  if (!KINGCAM_OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "KingCam Command is reserved for the CreatorVault owner." });
  }
}

function responseText(content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } } | { type: "file_url"; file_url: { url: string } }>): string {
  if (typeof content === "string") return content.trim();
  return content.filter((part): part is { type: "text"; text: string } => part.type === "text").map(part => part.text).join("\n").trim();
}

function commandContext(system: Awaited<ReturnType<typeof getKingcamCloneOperatingSystem>>) {
  const truths = system.truthLibrary.map((item) => ({
    room: item.room,
    route: item.route,
    fact: item.fact,
    state: item.proofState,
    restriction: item.restriction,
  }));
  const missions = system.launchMissionBoard.map((mission) => ({
    id: mission.id,
    title: mission.title,
    command: mission.command,
    room: mission.room,
    route: mission.route,
    state: mission.status,
    proofNeeded: mission.proofNeeded,
  }));
  const directives = system.recentMemory
    .filter((event) => event.kind === "owner_directive")
    .slice(0, 8)
    .map((event) => ({ room: event.room, directive: typeof event.payload.directive === "string" ? event.payload.directive : null, createdAt: event.createdAt }));

  return JSON.stringify({
    clone: system.cloneId,
    passport: system.identityPassport,
    truths,
    missions,
    ownerDirectives: directives,
    qualityGates: system.qualityPolicy.gates,
  });
}

export const kingcamBrainRouter = router({
  // Preserved legacy endpoint. Existing callers keep their current path.
  think: protectedProcedure.input(z.object({ query: z.string(), context: z.string().optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are KingCam Brain — the strategic intelligence layer for the KingCam creator platform. Think like a media mogul." },
        { role: "user", content: `${input.context ? `Context: ${input.context}\n` : ""}Query: ${input.query}` },
      ],
      max_tokens: 500,
    });
    return { response: c.choices[0].message.content };
  }),

  // New owner-only command. It is grounded in CreatorVault’s actual system,
  // not a generic persona prompt, and it never claims unproven output as real.
  askKingcamCommand: protectedProcedure
    .input(z.object({ query: z.string().trim().min(4).max(1600) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      const system = await getKingcamCloneOperatingSystem(ctx.user.id);
      const grounding = commandContext(system);
      let completion;
      try {
        completion = await invokeLLM({
          maxTokens: 700,
          messages: [
            {
              role: "system",
              content: [
                "You are KingCam Command inside CreatorVault. You are a powerful founder-grade operator, not a generic chatbot.",
                "You work from the approved CreatorVault grounding below. Preserve KingCam’s crown-and-suit visual canon, real-voice rule, owner identity, and proof-first standard.",
                "Never invent a CreatorVault feature, customer result, creator result, provider output, sale, audience number, voice result, or moving-clone proof.",
                "When a goal maps to a listed mission, name that mission and route. When proof is not ready, say exactly what proof is needed and keep the answer forward-moving.",
                "Answer in plain, confident language with: the move, why it matters, where to go, and what makes it real. Keep it concise and actionable.",
                `APPROVED KINGCAM GROUNDING:\n${grounding}`,
              ].join("\n\n"),
            },
            { role: "user", content: input.query },
          ],
        });
      } catch (error) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: error instanceof Error ? `KingCam Command could not reach its approved intelligence lane: ${error.message}` : "KingCam Command could not reach its approved intelligence lane.",
        });
      }

      const answer = responseText(completion.choices[0]?.message?.content ?? "");
      if (!answer) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "KingCam Command returned no usable answer. No generic fallback was used." });
      }

      return {
        answer,
        source: "grounded_kingcam_command",
        missions: system.launchMissionBoard.map((mission) => ({ id: mission.id, title: mission.title, route: mission.route, state: mission.status })),
      };
    }),

  getStrategicInsights: protectedProcedure.query(async ({ ctx }) => ({ insights: [], recommendations: [], userId: ctx.user.id })),

  searchChunks: protectedProcedure.input(z.object({ query: z.string(), limit: z.number().default(10) })).mutation(async ({ input }) => {
    const OpenAIClient = await import("openai");
    const client = new OpenAIClient.default();
    const c = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are KingCam's AI brain. Answer questions about his content, empire, and knowledge base." },
        { role: "user", content: input.query },
      ],
      max_tokens: 800,
    });
    return { results: [{ chunk: c.choices[0].message.content ?? "", score: 0.95, source: "KingCam Brain" }], query: input.query };
  }),
});
