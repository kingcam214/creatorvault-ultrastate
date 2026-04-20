import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const cloneToursRouter = router({
  createTour: protectedProcedure.input(z.object({
    cloneName: z.string(),
    tourType: z.enum(["virtual", "live", "hybrid"]),
    locations: z.array(z.string()),
    dates: z.array(z.string()),
    capacity: z.number().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a tour plan for AI clone "${input.cloneName}":
Type: ${input.tourType}
Locations: ${input.locations.join(", ")}
Dates: ${input.dates.join(", ")}
Capacity: ${input.capacity || "unlimited"}

Create: tour announcement copy, ticket pricing strategy, promotional content plan, and logistics checklist.`,
      }],
      max_tokens: 600,
    });
    return { tourPlan: completion.choices[0].message.content };
  }),

  getAllTours: protectedProcedure.query(async () => ({ tours: [], total: 0, message: "No tours created yet" })),
  getTourTemplates: protectedProcedure.query(async () => {
    return {
      templates: [
        { type: "virtual_masterclass", description: "Online workshop with AI clone", price: 97 },
        { type: "city_meetup", description: "In-person fan meetup", price: 47 },
        { type: "vip_experience", description: "Exclusive access event", price: 297 },
      ],
    };
  }),
});
