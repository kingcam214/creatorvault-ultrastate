import { z } from 'zod';

export const SceneShotMediaSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  shotType: z.enum(['A-Roll', 'B-Roll', 'Screen Recording', 'Audio', 'Montage', 'Hybrid']),
  requiredDescription: z.string(),
  assignedMediaUrl: z.string().nullable(),
  status: z.enum(['missing', 'assigned', 'approved', 'rejected']),
});

export type SceneShotMedia = z.infer<typeof SceneShotMediaSchema>;

export const JohannyMediaSessionSchema = z.object({
  creatorId: z.number(),
  projectId: z.string(),
  title: z.string(),
  status: z.enum(['planning', 'collecting_media', 'ready_to_render', 'rendering', 'complete']),
  scenes: z.array(z.object({
    sceneId: z.string(),
    chapter: z.string(),
    script: z.string(),
    shots: z.array(SceneShotMediaSchema),
  })),
  teasers: z.array(z.object({
    platform: z.string(),
    duration: z.string(),
    script: z.string(),
    shots: z.array(SceneShotMediaSchema),
  })),
});

export type JohannyMediaSession = z.infer<typeof JohannyMediaSessionSchema>;

export const MediaJobTypeSchema = z.enum([
  'YODEIRIS_LONGFORM_DEMO_V1',
  'YODEIRIS_VAULTX_TRAILER_V1',
  'STANDARD_TRAILER',
  'ANIMATED_FLYER'
]);

export type MediaJobType = z.infer<typeof MediaJobTypeSchema>;
