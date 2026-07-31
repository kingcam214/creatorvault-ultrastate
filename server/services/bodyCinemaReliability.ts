export type BodyCinemaGenerationState = "ready" | "in_flight";

export type BodyCinemaGenerationIdentity = {
  userId: number;
  imageUrl: string;
  prompt: string;
  resolution: string;
  length: string;
  mode: string;
  state: BodyCinemaGenerationState;
};

const READY_GENERATION_STATUSES = [
  "succeed",
  "success",
  "succeeded",
  "completed",
  "complete",
  "done",
] as const;

const FAILED_GENERATION_STATUSES = [
  "failed",
  "error",
  "cancelled",
  "canceled",
] as const;

const PROCESSING_GENERATION_STATUSES = [
  "processing",
  "running",
  "generating",
  "in_progress",
] as const;

const DIRECT_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);

export function normaliseBodyCinemaGenerationStatus(
  status: string | undefined | null,
): "waiting" | "processing" | "succeed" | "failed" {
  const value = String(status || "").trim().toLowerCase();
  if ((READY_GENERATION_STATUSES as readonly string[]).includes(value)) return "succeed";
  if ((FAILED_GENERATION_STATUSES as readonly string[]).includes(value)) return "failed";
  if ((PROCESSING_GENERATION_STATUSES as readonly string[]).includes(value)) return "processing";
  return "waiting";
}

export function buildBodyCinemaGenerationLookup(input: BodyCinemaGenerationIdentity): {
  stateClause: string;
  params: [number, string, string, string, string, string];
} {
  const readyValues = READY_GENERATION_STATUSES.map(value => `'${value}'`).join(", ");
  const terminalValues = [...READY_GENERATION_STATUSES, ...FAILED_GENERATION_STATUSES]
    .map(value => `'${value}'`)
    .join(", ");
  const stateClause = input.state === "ready"
    ? `LOWER(status) IN (${readyValues}) AND videoUrl IS NOT NULL AND videoUrl <> ''`
    : `LOWER(status) NOT IN (${terminalValues}) AND (videoUrl IS NULL OR videoUrl = '')`;

  return {
    stateClause,
    params: [input.userId, input.imageUrl, input.prompt, input.resolution, input.length, input.mode],
  };
}

export function buildVaultxCheckoutIdempotencyKey(packageId: number): string {
  if (!Number.isSafeInteger(packageId) || packageId <= 0) {
    throw new Error("A positive integer package ID is required for checkout idempotency.");
  }
  return `vaultx-package-${packageId}-checkout-v1`;
}

export function hasCompleteVaultxCheckout(pkg: {
  checkout_url?: unknown;
  stripe_checkout_session_id?: unknown;
}): boolean {
  return typeof pkg.checkout_url === "string"
    && pkg.checkout_url.trim().length > 0
    && typeof pkg.stripe_checkout_session_id === "string"
    && pkg.stripe_checkout_session_id.trim().length > 0;
}

export function sanitiseBodyCinemaUploadFilename(input: string | undefined | null): string {
  const leaf = String(input || "upload.mp4").split(/[\\/]/).pop() || "upload.mp4";
  const safe = leaf
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180);
  return safe || "upload.mp4";
}

export function isSupportedBodyCinemaVideoSelection(filename: string, suppliedMime: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const mime = String(suppliedMime || "").trim().toLowerCase();
  return DIRECT_VIDEO_EXTENSIONS.has(extension)
    && (mime.startsWith("video/") || mime === "application/octet-stream");
}
