import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const demosRouter = router({
  getDemos: publicProcedure.query(async () => {
    return {
      demos: [
        { id: "ai_content", name: "AI Content Generator", description: "Generate viral content in seconds", category: "AI" },
        { id: "video_studio", name: "Video Studio", description: "Professional video editing with AI", category: "Video" },
        { id: "empire_builder", name: "Empire Builder", description: "Build your creator empire", category: "Business" },
        { id: "clone_lab", name: "Clone Lab", description: "Create AI versions of yourself", category: "AI" },
        { id: "marketplace", name: "Marketplace", description: "Sell digital products instantly", category: "Commerce" },
      ],
    };
  }),

  runDemo: protectedProcedure.input(z.object({
    demoId: z.string(),
    input: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Demonstrate the ${input.demoId} feature with this input: ${input.input || "show me what you can do"}`,
      }],
      max_tokens: 400,
    });
    return { demo: completion.choices[0].message.content, demoId: input.demoId };
  }),
});
