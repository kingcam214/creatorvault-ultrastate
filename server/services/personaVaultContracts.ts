import { createHash } from "node:crypto";
import { z } from "zod";

export const secureMediaUrlSchema = z
  .string()
  .url()
  .max(1000)
  .refine(value => {
    const url = new URL(value);
    return (
      url.protocol === "https:" && !url.username && !url.password && !url.hash
    );
  }, "A credential-free HTTPS media URL is required");
export const wardrobeSchema = z.strictObject({
  tag: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().trim().min(1).max(300),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
});
export const accessoryAttributesSchema = z
  .record(
    z.string().min(1).max(48),
    z.union([
      z.string().max(160),
      z.number().finite(),
      z.boolean(),
      z.array(z.string().max(80)).max(10),
    ])
  )
  .refine(
    value => JSON.stringify(value).length <= 700,
    "Accessory identity attributes exceed the provider prompt budget"
  );
export const personaProfileSchema = z.strictObject({
  personaName: z.string().trim().min(1).max(120),
  avatarBaseUrl: secureMediaUrlSchema,
  loraModelId: z.string().trim().min(1).max(191).nullable().default(null),
  voiceProfileId: z.string().trim().min(1).max(191).nullable().default(null),
  triggerToken: z.string().trim().min(1).max(48).nullable().default(null),
  signatureWardrobes: z
    .array(wardrobeSchema)
    .max(20)
    .default([])
    .refine(
      wardrobes =>
        new Set(wardrobes.map(wardrobe => wardrobe.tag.toLowerCase())).size ===
        wardrobes.length,
      "Wardrobe tags must be unique"
    ),
  accessoryAttributes: accessoryAttributesSchema.default({}),
});
export const createPersonaSchema = personaProfileSchema.extend({
  ownershipConfirmed: z.literal(true),
  consentConfirmed: z.literal(true),
});
export const updatePersonaSchema = z.strictObject({
  personaId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  changes: z
    .strictObject({
      personaName: z.string().trim().min(1).max(120).optional(),
      avatarBaseUrl: secureMediaUrlSchema.optional(),
      loraModelId: z.string().trim().min(1).max(191).nullable().optional(),
      voiceProfileId: z.string().trim().min(1).max(191).nullable().optional(),
      triggerToken: z.string().trim().min(1).max(48).nullable().optional(),
      signatureWardrobes: z
        .array(wardrobeSchema)
        .max(20)
        .refine(
          wardrobes =>
            new Set(wardrobes.map(wardrobe => wardrobe.tag.toLowerCase()))
              .size === wardrobes.length,
          "Wardrobe tags must be unique"
        )
        .optional(),
      accessoryAttributes: accessoryAttributesSchema.optional(),
    })
    .refine(
      changes => Object.keys(changes).length > 0,
      "At least one change is required"
    ),
  ownershipConfirmed: z.literal(true),
  consentConfirmed: z.literal(true),
});
export const cameraMotionTypeSchema = z.enum([
  "stationary",
  "dolly_in",
  "dolly_out",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "orbit_left",
  "orbit_right",
  "tracking",
]);
const vectorSchema = z.strictObject({
  x: z.number().finite().min(-10).max(10),
  y: z.number().finite().min(-10).max(10),
  z: z.number().finite().min(-10).max(10),
});
export const cameraMetadataSchema = z.strictObject({
  motionType: cameraMotionTypeSchema,
  speed: z.number().finite().min(0).max(10),
  linearVelocity: vectorSchema,
  angularVelocity: z.strictObject({
    yaw: z.number().finite().min(-10).max(10),
    pitch: z.number().finite().min(-10).max(10),
    roll: z.number().finite().min(-10).max(10),
  }),
});
export const shotSchema = z.strictObject({
  durationSec: z.number().int().min(3).max(15),
  promptText: z.string().trim().min(1).max(1200),
  cameraMotionType: cameraMotionTypeSchema.optional(),
  cameraMetadata: cameraMetadataSchema
    .omit({ motionType: true })
    .partial()
    .optional(),
  endFrameUrl: secureMediaUrlSchema.optional(),
});
export const startVideoChainSchema = z.strictObject({
  personaId: z.string().uuid(),
  idempotencyKey: z
    .string()
    .trim()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9:_-]+$/),
  shots: z.array(shotSchema).min(1).max(24),
  wardrobeTag: z.string().max(48).optional(),
  frameRate: z
    .union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)])
    .default(30),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
});
export const personaSnapshotSchema = z.strictObject({
  personaId: z.string().uuid(),
  userId: z.number().int().positive(),
  version: z.number().int().positive(),
  personaName: z.string().min(1).max(120),
  avatarBaseUrl: secureMediaUrlSchema,
  avatarSha256: z.string().regex(/^[a-f0-9]{64}$/),
  loraModelId: z.string().nullable(),
  voiceProfileId: z.string().nullable(),
  triggerToken: z.string().nullable(),
  wardrobe: wardrobeSchema.nullable(),
  accessoryAttributes: accessoryAttributesSchema,
});
export const chainAuthorizationSchema = z.strictObject({
  ownerId: z.number().int().positive(),
  requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  maxCreditsPerSegment: z.number().finite().positive().max(10000),
  maximumOutputs: z.number().int().positive().max(24),
  authorizedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  reason: z.string().trim().min(10).max(1200),
});
export const approveVideoChainSchema = z.strictObject({
  chainId: z.string().uuid(),
  creatorId: z.number().int().positive(),
  expectedRequestHash: z.string().regex(/^[a-f0-9]{64}$/),
  maxCreditsPerSegment: z.number().finite().positive().max(10000),
  expiresInMinutes: z.number().int().min(1).max(30).default(10),
  reason: z.string().trim().min(10).max(1200),
});
export type Wardrobe = z.infer<typeof wardrobeSchema>;
export type AccessoryAttributes = z.infer<typeof accessoryAttributesSchema>;
export type PersonaProfile = z.infer<typeof personaProfileSchema>;
export type CreatePersonaInput = z.input<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.input<typeof updatePersonaSchema>;
export type CameraMetadata = z.infer<typeof cameraMetadataSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type StartVideoChainInput = z.input<typeof startVideoChainSchema>;
export type StartVideoChainRequest = z.infer<typeof startVideoChainSchema>;
export type PersonaIdentitySnapshot = z.infer<typeof personaSnapshotSchema>;
export type ChainAuthorization = z.infer<typeof chainAuthorizationSchema>;

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)])
    );
  return value;
}
export function identityHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)))
    .digest("hex");
}
export function inheritCameraMetadata(
  previous: CameraMetadata | null,
  shot: Pick<Shot, "cameraMotionType" | "cameraMetadata">
): CameraMetadata {
  const motionType =
    shot.cameraMotionType ?? previous?.motionType ?? "stationary";
  const speed =
    shot.cameraMetadata?.speed ??
    previous?.speed ??
    (motionType === "stationary" ? 0 : 1);
  const zero = { x: 0, y: 0, z: 0 };
  const velocity =
    motionType === "dolly_in"
      ? { ...zero, z: speed }
      : motionType === "dolly_out"
        ? { ...zero, z: -speed }
        : motionType === "pan_left"
          ? { ...zero, x: -speed }
          : motionType === "pan_right"
            ? { ...zero, x: speed }
            : zero;
  return cameraMetadataSchema.parse({
    motionType,
    speed,
    linearVelocity:
      shot.cameraMetadata?.linearVelocity ??
      previous?.linearVelocity ??
      velocity,
    angularVelocity: shot.cameraMetadata?.angularVelocity ??
      previous?.angularVelocity ?? { yaw: 0, pitch: 0, roll: 0 },
  });
}
export function assertPersonaChainOwner(userId: number): void {
  if (![6, 33].includes(userId))
    throw new Error(
      "Only the existing CreatorVault owners may authorize paid chain outputs"
    );
}
