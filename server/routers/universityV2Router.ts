import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const universityV2Router = router({
  getCourses: protectedProcedure.query(async () => {
    const courses = await db.db.select().from(db.schema.universityCourses).limit(20);
    return courses;
  }),
  enrollCourse: protectedProcedure.input(z.object({ courseId: z.number() })).mutation(async ({ ctx, input }) => {
    const [enrollment] = await db.db.insert(db.schema.universityEnrollments).values({ userId: ctx.user.id, courseId: input.courseId, status: "active", enrolledAt: new Date() }).$returningId();
    return { enrollmentId: enrollment.id, courseId: input.courseId };
  }),
  getMyEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await db.db.select().from(db.schema.universityEnrollments).where(eq(db.schema.universityEnrollments.userId, ctx.user.id)).limit(20);
    return enrollments;
  }),
  generateCourseContent: protectedProcedure.input(z.object({ topic: z.string(), level: z.string(), modules: z.number().default(5) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a ${input.modules}-module course outline for "${input.topic}" at ${input.level} level. Include: module title, key lessons, and practical exercises for each.` }], max_tokens: 700 });
    return { outline: c.choices[0].message.content };
  }),
});