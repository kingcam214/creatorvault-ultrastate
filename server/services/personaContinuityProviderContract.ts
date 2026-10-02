import { z } from "zod";
import {
  cameraMetadataSchema,
  identityHash,
  personaSnapshotSchema,
  secureMediaUrlSchema,
  type CameraMetadata,
  type PersonaIdentitySnapshot,
} from "./personaVaultContracts";

export const PERSONA_CONTINUITY_MODE = "persona_chained_continuity";
export const PERSONA_CONTINUITY_MODEL = "pollo/kling-ai/kling-v3-omni/video";
export const PERSONA_CONTINUITY_API_PATH =
  "/v1/generation/kling-ai/kling-v3-omni/video";
export const continuityContextSchema = z
  .strictObject({
    chainId: z.string().uuid(),
    segmentId: z.string().uuid(),
    segmentOrder: z.number().int().positive(),
    attempt: z.number().int().positive(),
    snapshot: personaSnapshotSchema,
    camera: cameraMetadataSchema,
    incomingCamera: cameraMetadataSchema.nullable(),
    sourceFrameUrl: secureMediaUrlSchema,
    sourceFrameSha256: z.string().regex(/^[a-f0-9]{64}$/),
    endFrameUrl: secureMediaUrlSchema.nullable(),
    endFrameSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    promptText: z.string().min(1).max(1200),
    durationSec: z.number().int().min(3).max(15),
    frameRate: z.number().int().positive(),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  })
  .refine(
    context =>
      (context.endFrameUrl === null) === (context.endFrameSha256 === null),
    "End-frame URL and checksum must be supplied together"
  );
export type ContinuityContext = z.infer<typeof continuityContextSchema>;
type PromptContext = {
  chainId: string;
  segmentId: string;
  snapshot: PersonaIdentitySnapshot;
  camera: CameraMetadata;
  incomingCamera: CameraMetadata | null;
  endFrameUrl: string | null;
  promptText: string;
};
export function buildPersonaContinuityPrompt(input: PromptContext): string {
  const fingerprint = identityHash({
    chainId: input.chainId,
    segmentId: input.segmentId,
    snapshot: input.snapshot,
    camera: input.camera,
    incomingCamera: input.incomingCamera,
    endFrameUrl: input.endFrameUrl,
    promptText: input.promptText,
  });
  const prompt = [
    `Identity continuity ${fingerprint}.`,
    `Preserve the exact ${input.snapshot.personaName} identity, face, anatomy, skin, hair and outfit in the source frame. ${input.snapshot.triggerToken ?? ""}`,
    input.snapshot.wardrobe
      ? `Locked wardrobe ${input.snapshot.wardrobe.tag}: ${input.snapshot.wardrobe.description}.`
      : "Preserve the source wardrobe without substitutions.",
    `Locked accessories: ${JSON.stringify(input.snapshot.accessoryAttributes)}.`,
    `Camera ${input.camera.motionType}, speed ${input.camera.speed}. Motion state ${JSON.stringify(input.camera)}.`,
    input.incomingCamera
      ? `Continue incoming momentum ${JSON.stringify(input.incomingCamera)} without easing to zero, movement resets or a camera jump.`
      : "Establish the specified camera motion.",
    "One continuous shot, no cuts, no new character, no identity replacement, no morphing, no slideshow, no crop, no text. Preserve the starting frame and scene geometry.",
    input.promptText,
  ].join("\n");
  if (prompt.length > 2500)
    throw new Error(
      "The complete locked-identity prompt exceeds the provider's 2500-character limit; shorten this shot without removing identity anchors"
    );
  return prompt;
}
export type PersonaContinuityProviderInput = {
  image: string;
  imageTail?: string;
  prompt: string;
  duration: number;
  mode: "pro";
  generateAudio: false;
};
type JobContract = {
  provider: string;
  providerModelPath: string;
  mode: string;
  sourceUrl: string;
  sourceChecksum: string | null;
  prompt: string;
  durationSeconds: number;
  metadata: Record<string, unknown>;
};
export function isPersonaContinuityJob(
  job: Pick<JobContract, "provider" | "providerModelPath" | "mode">
): boolean {
  return (
    job.provider === "pollo" &&
    job.providerModelPath === PERSONA_CONTINUITY_MODEL &&
    job.mode === PERSONA_CONTINUITY_MODE
  );
}
export function buildPersonaContinuityProviderInput(
  job: JobContract
): PersonaContinuityProviderInput {
  if (!isPersonaContinuityJob(job))
    throw new Error(
      "A documented Persona Continuity provider contract is required"
    );
  const context = continuityContextSchema.parse(job.metadata.personaContinuity);
  const expectedPrompt = buildPersonaContinuityPrompt({
    chainId: context.chainId,
    segmentId: context.segmentId,
    snapshot: context.snapshot,
    camera: context.camera,
    incomingCamera: context.incomingCamera,
    endFrameUrl: context.endFrameUrl,
    promptText: context.promptText,
  });
  if (
    job.sourceUrl !== context.sourceFrameUrl ||
    job.sourceChecksum !== context.sourceFrameSha256 ||
    job.prompt !== expectedPrompt ||
    job.durationSeconds !== context.durationSec
  ) {
    throw new Error(
      "The provider request no longer matches its immutable persona, frame, camera or duration snapshot"
    );
  }
  // Do not invent unsupported LoRA, voice, camera, aspect-ratio or FPS parameters.
  // The documented image-to-video API derives framing from image; camera/momentum
  // is expressed in its supported prompt. The frozen LoRA/voice IDs are provenance.
  return {
    image: context.sourceFrameUrl,
    ...(context.endFrameUrl ? { imageTail: context.endFrameUrl } : {}),
    prompt: expectedPrompt,
    duration: context.durationSec,
    mode: "pro",
    generateAudio: false,
  };
}
export async function quotePersonaContinuityProvider(
  input: PersonaContinuityProviderInput
): Promise<{ credits: number; costUsd: number; evidence: string }> {
  const apiKey = process.env.POLLO_API_KEY;
  if (!apiKey)
    throw new Error(
      "POLLO_API_KEY is not configured; no Persona Continuity generation was submitted"
    );
  const response = await fetch(
    `https://pollo.ai/api/platform${PERSONA_CONTINUITY_API_PATH}/estimate`,
    {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!response.ok)
    throw new Error(
      `Persona Continuity quote returned HTTP ${response.status}; no fallback price or generation is permitted`
    );
  const payload: unknown = await response.json();
  const envelope = z.record(z.string(), z.unknown()).parse(payload);
  const quote =
    envelope.data === undefined
      ? envelope
      : z.record(z.string(), z.unknown()).parse(envelope.data);
  const credits = z
    .number()
    .finite()
    .positive()
    .parse(
      quote.discountCost ??
        quote.cost ??
        quote.totalCost ??
        quote.credit ??
        quote.credits
    );
  const costUsd = z
    .number()
    .finite()
    .nonnegative()
    .parse(
      quote.discountCostUsd ?? quote.costUsd ?? quote.totalCostUsd ?? quote.usd
    );
  if (Math.round(credits * 100) / 100 !== credits)
    throw new Error(
      "Provider credit precision is unsupported; no generation was submitted"
    );
  return {
    credits,
    costUsd,
    evidence: `Provider quote ${PERSONA_CONTINUITY_API_PATH}/estimate; input SHA256 ${identityHash(input)}; quoted at ${new Date().toISOString()}; ${credits} credits / USD ${costUsd}`,
  };
}

export function verifyPersonaContinuityReceipt(
  expected: PersonaContinuityProviderInput,
  raw: unknown,
  taskId: string
) {
  const receipt = z
    .object({
      taskId: z.string(),
      input: z.record(z.string(), z.unknown()),
      credit: z.number().finite().nonnegative(),
      costUsd: z.number().finite().nonnegative(),
      generations: z
        .array(
          z.object({
            id: z.string(),
            status: z.enum(["waiting", "processing", "succeed", "failed"]),
            mediaType: z.literal("video"),
            url: z.string().nullable(),
            failMsg: z.string().nullable(),
          })
        )
        .max(1),
    })
    .parse(raw);
  if (
    receipt.taskId !== taskId ||
    Object.entries(expected).some(
      ([key, value]) =>
        !(key in receipt.input) ||
        identityHash(receipt.input[key]) !== identityHash(value)
    )
  )
    throw new Error(
      "This provider task receipt does not match the exact governed first-frame, end-frame, identity prompt and duration"
    );
  if (!expected.imageTail && receipt.input.imageTail)
    throw new Error(
      "This provider receipt includes an unapproved end-frame substitution"
    );
  return receipt;
}
