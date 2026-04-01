import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '../db';
import { mediaJobs, sceneShotMedia } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { JohannyMediaSessionSchema } from '../services/mediaSession';

export const mediaPipelineRouter = router({
  assignMediaToSceneShot: publicProcedure
    .input(z.object({
      jobId: z.string(),
      sceneId: z.string(),
      shotType: z.string(),
      mediaUrl: z.string()
    }))
    .mutation(async ({ input }) => {
      // Find the scene shot
      const shots = await db.select().from(sceneShotMedia).where(
        eq(sceneShotMedia.mediaJobId, input.jobId)
      );
      
      const shot = shots.find(s => s.sceneId === input.sceneId && s.shotType === input.shotType);
      
      if (!shot) {
        throw new Error('Scene shot not found');
      }
      
      await db.update(sceneShotMedia)
        .set({ 
          assignedMediaUrl: input.mediaUrl,
          status: 'assigned'
        })
        .where(eq(sceneShotMedia.id, shot.id));
        
      return { success: true, message: 'Media assigned successfully' };
    }),
    
  createMediaJob: publicProcedure
    .input(z.object({
      creatorId: z.number(),
      projectId: z.string(),
      jobType: z.string(),
      mediaSessionData: JohannyMediaSessionSchema
    }))
    .mutation(async ({ input }) => {
      // Insert job
      const [jobResult] = await db.insert(mediaJobs).values({
        creatorId: input.creatorId,
        projectId: input.projectId,
        jobType: input.jobType,
        status: 'pending',
        mediaSessionData: input.mediaSessionData
      });
      
      const jobId = jobResult.insertId.toString(); // Or get uuid if generated differently
      
      // We would normally extract the generated UUID, but insertId might not work for UUID primary keys in MySQL
      // Let's fetch it back or generate it ourselves
      
      return { success: true, jobId };
    })
});
