import {
  bodyCinemaHdJobSchema,
  bodyCinemaHdPrepareSchema,
  bodyCinemaHdExecuteSchema,
  type BodyCinemaHdJob,
  type BodyCinemaHdRecipe,
} from "../../shared/bodyCinemaHd";
import { compileBodyCinemaHdRecipe } from "./bodyCinemaHdBlueprint";
import { renderBodyCinemaHd } from "./bodyCinemaHdRenderEngine";
import { lstat } from "node:fs/promises";
import { createHash, randomUUID } from "crypto";
import { execFile } from "child_process";
import { constants } from "fs";
import { open, readFile, mkdir, chmod } from "fs/promises";
import type { FileHandle } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { z } from "zod";
import { getDb } from "../db";
import {
  BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION,
  bodyDirectedRightsInputSchema, bodyDirectedRightsSnapshotSchema,
  bodyDirectedAnalysisSchema, bodyDirectedLifecycleRecordSchema,
  bodyDirectedAnalyzeInputSchema, bodyDirectedFreezeInputSchema,
  type BodyDirectedLifecycleRecord, type BodyDirectedRightsInput,
} from "../../shared/bodyCinemaCandidateLifecycle";
import {
  BODY_FOCUS_LIBRARY, BODY_FOCUS_TREATMENTS, bodyDirectedPlanSchema,
  type BodyDirectedSourceMap,
} from "../../shared/bodyCinemaBodyDirection";
import { deriveBodyDirectedSourceMap, assessBodyDirectedTreatment } from "./bodyCinemaSourceMapService";
import { compileBodyDirectedPlan, recommendBodyDirectedOptions } from "./bodyCinemaEditBlueprintService";
import {
  BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
  BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION,
  bodyCinemaCandidateProvenanceSchema,
  bodyCinemaCrownRevealTreatmentSchema,
  bodyCinemaCreatorRightsSnapshotSchema,
  bodyCinemaDecisionSchema,
  bodyCinemaHandoffSchema,
  bodyCinemaLifecycleRecordSchema,
  bodyCinemaReviewSchema,
  bodyCinemaPublicAssetSnapshotSchema,
  type BodyCinemaCrownRevealTreatment,
  type BodyCinemaCreatorRightsInput,
  type BodyCinemaCreatorRightsSnapshot,
  type BodyCinemaLifecycleRecord,
  type BodyCinemaLifecycleState,
} from "../../shared/bodyCinemaCandidateLifecycle";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_CANDIDATE_BYTES = 2 * 1024 * 1024 * 1024;
const PROBE_TIMEOUT_MS = 10_000;
const CANDIDATE_PRIVATE_STORAGE_PREFIX = "body-cinema-candidate:";
const SOURCE_FEATURES = new Set([
  "body_cinema_direct_upload",
  "body_cinema_chunked_upload",
  "body_cinema_verified_source",
]);

type QueryExecutor = Pick<Pool, "query"> | Pick<PoolConnection, "query">;
type ExecuteExecutor = Pick<Pool, "execute"> | Pick<PoolConnection, "execute">;

type AssetRow = RowDataPacket & {
  id: string;
  user_id: number | string;
  source_type: string | null;
  asset_type: string | null;
  file_name: string | null;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | string | null;
  storage_path: string | null;
  public_url: string | null;
  duration: number | string | null;
  width: number | string | null;
  height: number | string | null;
  status: string | null;
  created_by_feature: string | null;
};

type LifecycleRow = RowDataPacket & {
  id: string;
  project_id: string;
  creator_id: number | string;
  source_asset_id: string;
  source_sha256: string;
  source_snapshot_json: unknown;
  rights_assertion_json: unknown;
  rights_assertion_hash: string;
  treatment_version: string | null;
  treatment_json: unknown;
  treatment_hash: string | null;
  state: string;
  candidate_asset_id: string | null;
  candidate_sha256: string | null;
  candidate_snapshot_json: unknown;
  candidate_provenance_json: unknown;
  attachment_authorization_json: unknown;
  review_id: string | null;
  review_json: unknown;
  decision_json: unknown;
  handoff_json: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProjectRow = RowDataPacket & {
  id: string;
  creator_id: number | string;
  accepted_media_asset_id: string | null;
};

type TrailerProjectRow = RowDataPacket & {
  id: string;
  user_id: number | string;
  project_type: string;
  source_asset_id: string;
};

type StoredSourceSnapshot = z.infer<
  typeof bodyCinemaPublicAssetSnapshotSchema
> & {
  canonicalStorageUrl: string;
  sourceType: string;
  createdByFeature: string;
};

type StoredCandidateSnapshot = z.infer<
  typeof bodyCinemaPublicAssetSnapshotSchema
> & {
  privatePathId: string;
  storagePath: string;
  createdByFeature: "body_cinema_candidate";
};

type ProbeResult = {
  codec: string;
  width: number;
  height: number;
  durationSeconds: number;
  formatName: string;
};

type OpenedArtifact = {
  handle: FileHandle;
  sha256: string;
  sizeBytes: number;
  probe: ProbeResult;
};

type VerifiedSource = {
  snapshot: StoredSourceSnapshot;
  opened?: OpenedArtifact;
};

type VerifiedCandidate = {
  snapshot: StoredCandidateSnapshot;
  opened?: OpenedArtifact;
};

const futureAttachmentGrantSchema = z
  .object({
    version: z.literal(BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION),
    lifecycleId: z.string().uuid(),
    issuerId: z.number().int().positive(),
    authorizationRef: z.string().trim().min(8).max(512),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/i),
    treatmentHash: z.string().regex(/^[a-f0-9]{64}$/i),
    candidateAssetId: z.string().min(1).max(191),
    candidateHash: z.string().regex(/^[a-f0-9]{64}$/i),
    provenanceReference: z.string().trim().min(8).max(512),
    privatePathId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
    expiresAt: z.string().datetime(),
    singleUseState: z.enum(["available", "consumed"]),
    consumedAt: z.string().datetime().optional(),
  })
  .strict();
type FutureAttachmentGrant = z.infer<typeof futureAttachmentGrantSchema>;

export class BodyCinemaLifecycleError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "conflict"
      | "precondition"
      | "forbidden",
    message: string
  ) {
    super(message);
    this.name = "BodyCinemaLifecycleError";
  }
}

function failure(
  code: BodyCinemaLifecycleError["code"],
  message: string
): never {
  throw new BodyCinemaLifecycleError(code, message);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function valueOrNull(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function finiteNumber(value: unknown, label: string): number {
  const result = Number(value);
  if (!Number.isFinite(result))
    failure("precondition", `${label} is not readable.`);
  return result;
}

function positiveInteger(value: unknown, label: string): number {
  const result = finiteNumber(value, label);
  if (!Number.isInteger(result) || result <= 0) {
    failure("precondition", `${label} is not a positive whole number.`);
  }
  return result;
}

function toIso(value: Date | string | null | undefined, label: string): string {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime()))
    failure("precondition", `${label} is invalid.`);
  return date.toISOString();
}

function parseJsonRecord(
  value: unknown,
  label: string
): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string")
    failure("precondition", `${label} is missing.`);
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      failure("precondition", `${label} is not an object.`);
    }
    return parsed as Record<string, unknown>;
  } catch {
    failure("precondition", `${label} is unreadable.`);
  }
}

function stableJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      failure(
        "precondition",
        "A lifecycle snapshot contains a non-finite number."
      );
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  failure(
    "precondition",
    "A lifecycle snapshot contains an unsupported value."
  );
}

function digest(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

async function queryRows<T extends RowDataPacket>(
  executor: QueryExecutor,
  statement: string,
  parameters: unknown[] = []
): Promise<T[]> {
  const [rows] = await executor.query<T[]>(statement, parameters);
  return rows;
}

async function execute(
  executor: ExecuteExecutor,
  statement: string,
  parameters: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await executor.execute<ResultSetHeader>(
    statement,
    parameters
  );
  return result;
}

function storageRoots(): {
  sourceRoot: string;
  sourceReceiptRoot: string;
  candidateRoot: string;
  localProof: boolean;
} {
  const localProofEnabled = process.env.CREATORVAULT_LOCAL_PROOF_MODE;
  if (
    localProofEnabled &&
    (localProofEnabled !== "1" || process.env.NODE_ENV !== "test")
  ) {
    failure("precondition", "LOCAL_PROOF_STORAGE_CONFIGURATION_REJECTED");
  }
  if (localProofEnabled === "1") {
    const configuredRoot = normalizeText(
      process.env.CREATORVAULT_BODY_CINEMA_TEST_STORAGE_ROOT ||
        process.env.CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT
    );
    if (!configuredRoot || !path.isAbsolute(configuredRoot)) {
      failure("precondition", "LOCAL_PROOF_STORAGE_CONFIGURATION_REJECTED");
    }
    const root = path.resolve(configuredRoot);
    const temporaryRoot = path.resolve(os.tmpdir());
    if (
      path.dirname(root) !== temporaryRoot ||
      !/^creatorvault-cv-video-026-[A-Za-z0-9_-]+$/.test(path.basename(root))
    ) {
      failure("precondition", "LOCAL_PROOF_STORAGE_CONFIGURATION_REJECTED");
    }
    return {
      sourceRoot: path.join(root, "content-vault"),
      sourceReceiptRoot: path.join(root, "content-vault-receipts"),
      candidateRoot: path.join(root, ".body-cinema-candidates"),
      localProof: true,
    };
  }
  return {
    sourceRoot: "/root/uploads/content-vault",
    sourceReceiptRoot: "/root/uploads/content-vault-receipts",
    candidateRoot: "/root/creatorvault/.body-cinema-candidates",
    localProof: false,
  };
}

function assertInsideRoot(root: string, target: string, label: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (
    path.dirname(resolvedTarget) !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    failure("precondition", `${label} is outside its protected storage root.`);
  }
  return resolvedTarget;
}

function sourceUrlToPath(
  url: string,
  filename: string
): { storageId: string; filePath: string; canonicalUrl: string } {
  const roots = storageRoots();
  const expectedBase = "/uploads/content-vault";
  let pathname: string;
  let canonicalUrl: string;
  if (roots.localProof) {
    if (!url.startsWith("/"))
      failure(
        "precondition",
        "The source storage URL is not a local-proof vault path."
      );
    const parsed = new URL(url, "http://creatorvault.local");
    if (parsed.search || parsed.hash)
      failure(
        "precondition",
        "The source storage URL cannot include a query or fragment."
      );
    pathname = parsed.pathname;
    canonicalUrl = pathname;
  } else {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      failure("precondition", "The source storage URL is invalid.");
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "creatorvault.live" ||
      parsed.port ||
      parsed.search ||
      parsed.hash
    ) {
      failure(
        "precondition",
        "The source storage URL is not the canonical CreatorVault content vault URL."
      );
    }
    pathname = parsed.pathname;
    canonicalUrl = `https://creatorvault.live${pathname}`;
  }
  const pieces = pathname.split("/").filter(Boolean);
  if (pieces.length !== 4 || `/${pieces[0]}/${pieces[1]}` !== expectedBase) {
    failure(
      "precondition",
      "The source storage URL does not map to one content-vault object."
    );
  }
  const storageId = pieces[2];
  const encodedFilename = pieces[3];
  if (!/^[A-Za-z0-9-]{16,128}$/.test(storageId)) {
    failure("precondition", "The source storage identifier is invalid.");
  }
  let decodedFilename: string;
  try {
    decodedFilename = decodeURIComponent(encodedFilename);
  } catch {
    failure("precondition", "The source filename encoding is invalid.");
  }
  if (
    !decodedFilename ||
    decodedFilename !== filename ||
    path.basename(decodedFilename) !== decodedFilename ||
    decodedFilename.includes("\\") ||
    encodedFilename !== encodeURIComponent(filename)
  ) {
    failure(
      "precondition",
      "The source URL and stored filename do not match exactly."
    );
  }
  const expectedPath = assertInsideRoot(
    roots.sourceRoot,
    path.join(roots.sourceRoot, storageId, filename),
    "The source file"
  );
  if (
    path.dirname(expectedPath) !==
    path.join(path.resolve(roots.sourceRoot), storageId)
  ) {
    failure("precondition", "The source storage path is not canonical.");
  }
  return { storageId, filePath: expectedPath, canonicalUrl };
}

async function readProtectedJson(
  filePath: string,
  label: string
): Promise<Record<string, unknown>> {
  let handle: FileHandle | null = null;
  try {
    handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const status = await handle.stat();
    if (!status.isFile() || status.size < 2 || status.size > 1_048_576) {
      failure("precondition", `${label} is unavailable.`);
    }
    const content = await handle.readFile({ encoding: "utf8" });
    return parseJsonRecord(content, label);
  } catch (error) {
    if (error instanceof BodyCinemaLifecycleError) throw error;
    return failure("precondition", `${label} is unavailable.`);
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function readTrustedAttachmentGrant(
  privatePathId: string
): Promise<FutureAttachmentGrant> {
  const roots = storageRoots();
  const grantPath = assertInsideRoot(
    roots.candidateRoot,
    path.join(roots.candidateRoot, `${privatePathId}.grant.json`),
    "The future attachment grant"
  );
  let handle: FileHandle | null = null;
  try {
    handle = await open(grantPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const status = await handle.stat();
    const currentUid =
      typeof process.getuid === "function" ? process.getuid() : null;
    if (
      !status.isFile() ||
      status.size < 2 ||
      status.size > 65_536 ||
      (currentUid !== null && status.uid !== currentUid) ||
      (status.mode & 0o777) !== 0o600
    ) {
      failure(
        "forbidden",
        "The future attachment grant file is not trusted private storage."
      );
    }
    return futureAttachmentGrantSchema.parse(
      parseJsonRecord(
        await handle.readFile({ encoding: "utf8" }),
        "The future attachment grant file"
      )
    );
  } catch (error) {
    if (error instanceof BodyCinemaLifecycleError) throw error;
    return failure(
      "forbidden",
      "The future attachment grant file is unavailable."
    );
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function inspectOpenedArtifact(
  filePath: string,
  maximumBytes: number,
  keepOpen: boolean
): Promise<OpenedArtifact> {
  let handle: FileHandle | null = null;
  try {
    handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (!before.isFile() || before.size < 1 || before.size > maximumBytes) {
      failure(
        "precondition",
        "The protected media artifact is missing or outside the byte limit."
      );
    }
    const probe = await probeOpenedArtifact(handle);
    const sha256 = createHash("sha256");
    let readBytes = 0;
    const stream = handle.createReadStream({ autoClose: false });
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      readBytes += buffer.length;
      if (readBytes > maximumBytes) {
        stream.destroy();
        failure(
          "precondition",
          "The protected media artifact exceeded its byte limit while hashing."
        );
      }
      sha256.update(buffer);
    }
    const after = await handle.stat();
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      readBytes !== Number(before.size)
    ) {
      failure(
        "precondition",
        "The protected media artifact changed while it was being verified."
      );
    }
    const inspected: OpenedArtifact = {
      handle,
      sha256: sha256.digest("hex"),
      sizeBytes: Number(before.size),
      probe,
    };
    handle = null;
    return inspected;
  } catch (error) {
    if (error instanceof BodyCinemaLifecycleError) throw error;
    return failure(
      "precondition",
      "CreatorVault could not safely open the protected media artifact."
    );
  } finally {
    if (handle && !keepOpen) await handle.close().catch(() => undefined);
    if (handle && keepOpen) await handle.close().catch(() => undefined);
  }
}

async function probeOpenedArtifact(handle: FileHandle): Promise<ProbeResult> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,width,height,duration:format=duration,format_name",
        "-of",
        "json",
        `/proc/${process.pid}/fd/${handle.fd}`,
      ],
      { timeout: PROBE_TIMEOUT_MS, maxBuffer: 128 * 1024, encoding: "utf8" }
    );
    const parsed: unknown = JSON.parse(String(stdout || "{}"));
    const record = parseJsonRecord(parsed, "The media probe");
    const streams = record.streams;
    const stream = Array.isArray(streams) ? streams[0] : null;
    const streamRecord = parseJsonRecord(stream, "The media video stream");
    const formatRecord = parseJsonRecord(record.format, "The media container");
    const codec = normalizeText(streamRecord.codec_name).toLowerCase();
    const width = positiveInteger(streamRecord.width, "The media width");
    const height = positiveInteger(streamRecord.height, "The media height");
    const durationSeconds = finiteNumber(
      formatRecord.duration ?? streamRecord.duration,
      "The media duration"
    );
    const formatName = normalizeText(formatRecord.format_name).toLowerCase();
    if (
      !codec ||
      durationSeconds <= 0 ||
      durationSeconds > 600 ||
      !formatName
    ) {
      failure(
        "precondition",
        "The protected media artifact is not a bounded playable video."
      );
    }
    return {
      codec,
      width,
      height,
      durationSeconds: Number(durationSeconds.toFixed(3)),
      formatName,
    };
  } catch (error) {
    if (error instanceof BodyCinemaLifecycleError) throw error;
    failure(
      "precondition",
      "CreatorVault could not read the protected video metadata."
    );
  }
}

function sourceFeatureAllowed(feature: string): boolean {
  return (
    SOURCE_FEATURES.has(feature) &&
    !/(demo|kingcam|finished|generated|render|flyer|marketing)/i.test(feature)
  );
}

function assetFileName(asset: AssetRow): string {
  const fileName =
    valueOrNull(asset.original_name) ?? valueOrNull(asset.file_name);
  if (
    !fileName ||
    path.basename(fileName) !== fileName ||
    fileName.includes("\\")
  ) {
    failure("precondition", "The stored media asset filename is invalid.");
  }
  return fileName;
}

function assetMime(asset: AssetRow): string {
  const mime = normalizeText(asset.mime_type).toLowerCase();
  if (!mime.startsWith("video/"))
    failure("precondition", "The stored media asset is not a video.");
  return mime;
}

function assertReadyOwner(asset: AssetRow, creatorId: number): void {
  if (Number(asset.user_id) !== creatorId) {
    failure(
      "forbidden",
      "This media asset does not belong to the current creator."
    );
  }
  if (normalizeText(asset.status) !== "ready") {
    failure(
      "precondition",
      "Only a ready CreatorVault media artifact can enter this lifecycle."
    );
  }
  if (
    normalizeText(asset.asset_type) !== "video" &&
    !assetMime(asset).startsWith("video/")
  ) {
    failure(
      "precondition",
      "Only a ready video artifact can enter this lifecycle."
    );
  }
}

function receiptNumber(receipt: Record<string, unknown>, name: string): number {
  return positiveInteger(receipt[name], `The storage receipt ${name}`);
}

function receiptText(receipt: Record<string, unknown>, name: string): string {
  const value = normalizeText(receipt[name]);
  if (!value)
    failure("precondition", `The storage receipt ${name} is missing.`);
  return value;
}

function sameDuration(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.05;
}

function publicSourceSnapshot(
  snapshot: StoredSourceSnapshot
): z.infer<typeof bodyCinemaPublicAssetSnapshotSchema> {
  const {
    canonicalStorageUrl: _canonicalStorageUrl,
    sourceType: _sourceType,
    createdByFeature: _createdByFeature,
    ...publicSnapshot
  } = snapshot;
  return publicSnapshot;
}

function publicCandidateSnapshot(
  snapshot: StoredCandidateSnapshot
): z.infer<typeof bodyCinemaPublicAssetSnapshotSchema> {
  const {
    privatePathId: _privatePathId,
    storagePath: _storagePath,
    createdByFeature: _createdByFeature,
    ...publicSnapshot
  } = snapshot;
  return publicSnapshot;
}

function parseStoredSource(value: unknown): StoredSourceSnapshot {
  const record = parseJsonRecord(value, "The frozen source snapshot");
  const canonicalStorageUrl = receiptText(record, "canonicalStorageUrl");
  const sourceType = receiptText(record, "sourceType");
  const createdByFeature = receiptText(record, "createdByFeature");
  const {
    canonicalStorageUrl: _canonicalStorageUrl,
    sourceType: _sourceType,
    createdByFeature: _createdByFeature,
    ...publicRecord
  } = record;
  const publicSnapshot =
    bodyCinemaPublicAssetSnapshotSchema.parse(publicRecord);
  return {
    ...publicSnapshot,
    canonicalStorageUrl,
    sourceType,
    createdByFeature,
  };
}

function parseStoredCandidate(value: unknown): StoredCandidateSnapshot {
  const record = parseJsonRecord(value, "The frozen candidate snapshot");
  const privatePathId = receiptText(record, "privatePathId");
  const storagePath = receiptText(record, "storagePath");
  const createdByFeature = receiptText(record, "createdByFeature");
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(privatePathId)) {
    failure(
      "precondition",
      "The frozen candidate private path identifier is invalid."
    );
  }
  if (createdByFeature !== "body_cinema_candidate") {
    failure("precondition", "The frozen candidate feature marker is invalid.");
  }
  const {
    privatePathId: _privatePathId,
    storagePath: _storagePath,
    createdByFeature: _createdByFeature,
    ...publicRecord
  } = record;
  const publicSnapshot =
    bodyCinemaPublicAssetSnapshotSchema.parse(publicRecord);
  return {
    ...publicSnapshot,
    privatePathId,
    storagePath,
    createdByFeature: "body_cinema_candidate",
  };
}

// Existing text-column collations may be narrower than UTF-8. Escaping storage
// JSON preserves the decoded snapshot and its canonical immutable hash.
function bodyDirectedMetadataJson(value: unknown): string {
  return JSON.stringify(value).replace(/[^\x00-\x7F]/g, character =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

function isBodyDirectedRow(row: LifecycleRow): boolean {
  return parseJsonRecord(row.rights_assertion_json, "The creator assertion").version === BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION;
}
function requireLegacyCandidateAuthority(row: LifecycleRow): void {
  if (isBodyDirectedRow(row)) failure("precondition", "This body-directed plan has no candidate, rendering, review, acceptance or Trailer Maker execution authority.");
}
function parseLifecycle(row: LifecycleRow): BodyCinemaLifecycleRecord {
  requireLegacyCandidateAuthority(row);
  const source = parseStoredSource(row.source_snapshot_json);
  const candidate = row.candidate_snapshot_json
    ? parseStoredCandidate(row.candidate_snapshot_json)
    : null;
  const rights = bodyCinemaCreatorRightsSnapshotSchema.parse(
    parseJsonRecord(row.rights_assertion_json, "The rights assertion snapshot")
  );
  const treatment = row.treatment_json
    ? bodyCinemaCrownRevealTreatmentSchema.parse(
        parseJsonRecord(row.treatment_json, "The frozen treatment")
      )
    : null;
  const candidateProvenance = row.candidate_provenance_json
    ? bodyCinemaCandidateProvenanceSchema.parse(
        parseJsonRecord(
          row.candidate_provenance_json,
          "The candidate provenance"
        )
      )
    : null;
  const review = row.review_json
    ? bodyCinemaReviewSchema.parse(
        parseJsonRecord(row.review_json, "The review record")
      )
    : null;
  const decision = row.decision_json
    ? bodyCinemaDecisionSchema.parse(
        parseJsonRecord(row.decision_json, "The decision record")
      )
    : null;
  const handoff = row.handoff_json
    ? bodyCinemaHandoffSchema.parse(
        parseJsonRecord(row.handoff_json, "The handoff record")
      )
    : null;
  return bodyCinemaLifecycleRecordSchema.parse({
    id: row.id,
    projectId: row.project_id,
    creatorId: Number(row.creator_id),
    state: row.state as BodyCinemaLifecycleState,
    source: publicSourceSnapshot(source),
    rights,
    treatment,
    treatmentHash: valueOrNull(row.treatment_hash),
    candidate: candidate ? publicCandidateSnapshot(candidate) : null,
    candidateProvenance,
    review,
    decision,
    handoff,
    createdAt: toIso(row.created_at, "The lifecycle creation time"),
    updatedAt: toIso(row.updated_at, "The lifecycle update time"),
  });
}

function assertMatchingSourceSnapshot(
  expected: StoredSourceSnapshot,
  actual: StoredSourceSnapshot
): void {
  if (digest(expected) !== digest(actual)) {
    failure(
      "precondition",
      "The source receipt, metadata, or bytes changed after qualification."
    );
  }
}

function assertMatchingCandidateSnapshot(
  expected: StoredCandidateSnapshot,
  actual: StoredCandidateSnapshot
): void {
  if (digest(expected) !== digest(actual)) {
    failure(
      "precondition",
      "The candidate receipt, metadata, or bytes changed after attachment."
    );
  }
}

function validateTreatment(
  treatment: BodyCinemaCrownRevealTreatment,
  source: StoredSourceSnapshot
): void {
  if (
    treatment.sourceMoment.endSeconds <= treatment.sourceMoment.startSeconds
  ) {
    failure(
      "precondition",
      "The selected source moment must have a positive duration."
    );
  }
  if (treatment.sourceMoment.endSeconds > source.durationSeconds + 0.05) {
    failure(
      "precondition",
      "The selected source moment exceeds the verified source duration."
    );
  }
  if (
    treatment.proposedOutput.durationSeconds >
    source.durationSeconds + 0.05
  ) {
    failure(
      "precondition",
      "A no-repeat Crown Reveal plan cannot exceed the verified source duration."
    );
  }
  const crop = treatment.cropBoundaries;
  if (crop.left + crop.width > 1 || crop.top + crop.height > 1) {
    failure(
      "precondition",
      "The creator-approved crop boundaries exceed the source frame."
    );
  }
  const outputRatio =
    treatment.proposedOutput.height / treatment.proposedOutput.width;
  if (Math.abs(outputRatio - 16 / 9) > 0.02) {
    failure(
      "precondition",
      "The Crown Reveal plan must retain its proposed 9:16 output ratio."
    );
  }
}

function lifecycleEventDetail(input: Record<string, unknown>): string {
  return JSON.stringify(input);
}

async function appendEvent(
  connection: PoolConnection,
  projectId: string,
  creatorId: number,
  eventType: string,
  detail: Record<string, unknown>
): Promise<void> {
  await execute(
    connection,
    `INSERT INTO creation_project_events
      (id, project_id, actor_id, event_type, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
    [
      randomUUID(),
      projectId,
      creatorId,
      eventType,
      lifecycleEventDetail(detail),
    ]
  );
}

export type BodyCinemaPlaybackArtifact = {
  handle: FileHandle;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export class BodyCinemaCandidateLifecycleService {
  constructor(private readonly pool: Pool) {}

  async getHdRender(
    creatorId: number,
    id: string
  ): Promise<BodyCinemaHdJob | null> {
    return this.transaction(async connection => {
      const row = await this.lockBodyDirectedRow(connection, creatorId, id);
      const record = await this.readBodyDirectedRecord(connection, row);
      const project = await this.readBodyDirectedProject(connection, row, true);
      const metadata = parseJsonRecord(
        project.metadata_json,
        "The owned project metadata"
      );
      if (!metadata.bodyCinemaHdRenderV1) return null;
      const job = this.parseHdJob(metadata.bodyCinemaHdRenderV1, record);
      if (
        job.status === "rendering" &&
        job.startedAt &&
        Date.now() - Date.parse(job.startedAt) > 12 * 60 * 1000
      ) {
        const failed = bodyCinemaHdJobSchema.parse({
          ...job,
          status: "failed",
          error:
            "The bounded render did not finish. No automatic retry or replacement is authorized.",
          completedAt: new Date().toISOString(),
        });
        await this.saveHdJob(connection, row, metadata, failed);
        return failed;
      }
      return job;
    });
  }

  private parseHdJob(
    value: unknown,
    record: BodyDirectedLifecycleRecord
  ): BodyCinemaHdJob {
    const job = bodyCinemaHdJobSchema.parse(value);
    if (
      job.lifecycleId !== record.id ||
      job.creatorId !== record.creatorId ||
      job.treatmentHash !== record.treatmentHash ||
      job.recipeHash !== digest(job.recipe) ||
      job.recipe.sourceSha256 !== record.source.sha256 ||
      job.recipe.sourceAssetId !== record.source.assetId
    )
      failure(
        "precondition",
        "The private HD receipt does not match the immutable creator, source and plan."
      );
    return job;
  }

  private async saveHdJob(
    connection: PoolConnection,
    row: LifecycleRow,
    metadata: Record<string, unknown>,
    job: BodyCinemaHdJob
  ): Promise<void> {
    await execute(
      connection,
      "UPDATE creation_projects SET metadata_json=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=? AND creator_id=?",
      [
        JSON.stringify({ ...metadata, bodyCinemaHdRenderV1: job }),
        row.project_id,
        job.creatorId,
      ]
    );
  }

  async prepareHdRender(
    input: { creatorId: number } & z.infer<typeof bodyCinemaHdPrepareSchema>
  ): Promise<BodyCinemaHdJob> {
    const parsed = bodyCinemaHdPrepareSchema.parse({
      id: input.id,
      treatmentHash: input.treatmentHash,
      segments: input.segments,
    });
    return this.transaction(async connection => {
      const row = await this.lockBodyDirectedRow(
        connection,
        input.creatorId,
        parsed.id
      );
      await this.reverifyFrozenSource(connection, row, input.creatorId);
      const record = await this.readBodyDirectedRecord(connection, row);
      if (record.treatmentHash !== parsed.treatmentHash)
        failure(
          "conflict",
          "The selected saved plan changed; review it before creating an HD blueprint."
        );
      let recipe: BodyCinemaHdRecipe;
      try {
        recipe = compileBodyCinemaHdRecipe(record, parsed.segments);
      } catch (error) {
        failure(
          "precondition",
          error instanceof Error
            ? error.message
            : "This original cannot support a safe full-length HD sequence."
        );
      }
      const recipeHash = digest(recipe);
      const project = await this.readBodyDirectedProject(connection, row, true);
      const metadata = parseJsonRecord(
        project.metadata_json,
        "The owned project metadata"
      );
      if (metadata.bodyCinemaHdRenderV1) {
        const existing = this.parseHdJob(metadata.bodyCinemaHdRenderV1, record);
        if (existing.recipeHash === recipeHash) return existing;
        failure(
          "conflict",
          "The separate saved HD blueprint is immutable. Its history cannot be silently replaced."
        );
      }
      const job = bodyCinemaHdJobSchema.parse({
        version: "body_cinema.hd_job.v1",
        id: randomUUID(),
        lifecycleId: row.id,
        creatorId: input.creatorId,
        treatmentHash: parsed.treatmentHash,
        recipe,
        recipeHash,
        status: "prepared",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        error: null,
        candidate: null,
        ownerAcceptance: "not_reviewed",
        externalCostUsd: 0,
        providerCallMade: false,
      });
      await this.saveHdJob(connection, row, metadata, job);
      await appendEvent(
        connection,
        row.project_id,
        input.creatorId,
        "body_cinema_hd_blueprint_prepared",
        {
          jobId: job.id,
          recipeHash,
          sourceSha256: recipe.sourceSha256,
          treatmentHash: job.treatmentHash,
          historicalPlanChanged: false,
        }
      );
      return job;
    });
  }

  async executeHdRender(
    input: { creatorId: number } & z.infer<typeof bodyCinemaHdExecuteSchema>
  ): Promise<BodyCinemaHdJob> {
    const parsed = bodyCinemaHdExecuteSchema.parse({
      id: input.id,
      jobId: input.jobId,
      recipeHash: input.recipeHash,
      authorization: input.authorization,
    });
    const gate = await this.pool.getConnection();
    let acquired = false;
    try {
      const locked = await queryRows<RowDataPacket & { acquired: number }>(
        gate,
        "SELECT GET_LOCK('creatorvault_body_cinema_hd_single_worker_v1',0) AS acquired"
      );
      acquired = Number(locked[0]?.acquired) === 1;
      if (!acquired)
        failure(
          "precondition",
          "Another HD candidate is rendering. This saved blueprint is unchanged; wait for that job to finish."
        );
      const admission = await this.transaction(async connection => {
        const row = await this.lockBodyDirectedRow(
          connection,
          input.creatorId,
          parsed.id
        );
        await this.reverifyFrozenSource(connection, row, input.creatorId);
        const record = await this.readBodyDirectedRecord(connection, row);
        const project = await this.readBodyDirectedProject(
          connection,
          row,
          true
        );
        const metadata = parseJsonRecord(
          project.metadata_json,
          "The owned project metadata"
        );
        const current = this.parseHdJob(metadata.bodyCinemaHdRenderV1, record);
        if (
          current.id !== parsed.jobId ||
          current.recipeHash !== parsed.recipeHash
        )
          failure(
            "conflict",
            "Render authorization must name the exact saved HD blueprint."
          );
        if (current.status !== "prepared")
          return { job: current, launch: false };
        compileBodyCinemaHdRecipe(record, current.recipe.segments);
        const next = bodyCinemaHdJobSchema.parse({
          ...current,
          status: "rendering",
          startedAt: new Date().toISOString(),
        });
        await this.saveHdJob(connection, row, metadata, next);
        await appendEvent(
          connection,
          row.project_id,
          input.creatorId,
          "body_cinema_hd_private_render_authorized",
          {
            jobId: next.id,
            recipeHash: next.recipeHash,
            authorization: parsed.authorization,
            execution: "local_ffmpeg_only",
            externalCostUsd: 0,
            providerCallMade: false,
          }
        );
        return { job: next, launch: true };
      });
      const job = admission.job;
      if (!admission.launch) {
        await gate.query(
          "DO RELEASE_LOCK('creatorvault_body_cinema_hd_single_worker_v1')"
        );
        gate.release();
        return job;
      }
      // Admission and one-use status are durable before this finite worker starts. Failures never trigger another export.
      void this.runHdRender(job)
        .catch(() => undefined)
        .finally(async () => {
          await gate
            .query(
              "DO RELEASE_LOCK('creatorvault_body_cinema_hd_single_worker_v1')"
            )
            .catch(() => undefined);
          gate.release();
        });
      return job;
    } catch (error) {
      if (acquired)
        await gate
          .query(
            "DO RELEASE_LOCK('creatorvault_body_cinema_hd_single_worker_v1')"
          )
          .catch(() => undefined);
      gate.release();
      throw error;
    }
  }

  private async runHdRender(job: BodyCinemaHdJob): Promise<void> {
    let source: BodyCinemaPlaybackArtifact | null = null;
    try {
      const roots = storageRoots();
      await mkdir(roots.candidateRoot, { recursive: true, mode: 0o700 });
      const directory = await lstat(roots.candidateRoot);
      if (
        !directory.isDirectory() ||
        directory.isSymbolicLink() ||
        directory.uid !== process.getuid?.() ||
        (directory.mode & 0o077) !== 0
      )
        failure(
          "forbidden",
          "The candidate storage must be a private trusted directory."
        );
      const pathId = `hd_${job.id.replace(/-/g, "")}`;
      const outputPath = path.join(roots.candidateRoot, pathId);
      source = await this.openPlayback({
        creatorId: job.creatorId,
        id: job.lifecycleId,
        artifact: "source",
      });
      const result = await renderBodyCinemaHd({
        sourcePath: `/proc/${process.pid}/fd/${source.handle.fd}`,
        outputPath,
        recipe: job.recipe,
      });
      await chmod(outputPath, 0o600);
      const filename = `body-cinema-${job.recipe.visualGradeId}-${job.id}.mp4`;
      const receipt = {
        privatePathId: pathId,
        creatorId: job.creatorId,
        filename,
        size: result.sizeBytes,
        sha256: result.sha256,
        verified: true,
        classification: "body_cinema_candidate",
        sourceHash: job.recipe.sourceSha256,
        treatmentHash: job.treatmentHash,
        recipeHash: job.recipeHash,
        execution: "local_ffmpeg_hd",
        ownerAcceptance: "not_reviewed",
        media: {
          codec: "h264",
          width: result.width,
          height: result.height,
          durationSec: result.durationSeconds,
          frameRate: result.frameRate,
          frameCount: result.frameCount,
          hasAudio: result.hasAudio,
        },
      };
      const receiptFile = await open(
        path.join(roots.candidateRoot, `${pathId}.receipt.json`),
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600
      );
      try {
        await receiptFile.writeFile(JSON.stringify(receipt));
        await receiptFile.sync();
      } finally {
        await receiptFile.close();
      }
      const receiptDirectory = await open(
        roots.candidateRoot,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
      );
      try {
        await receiptDirectory.sync();
      } finally {
        await receiptDirectory.close();
      }
      await this.transaction(async connection => {
        const row = await this.lockBodyDirectedRow(
          connection,
          job.creatorId,
          job.lifecycleId
        );
        const record = await this.readBodyDirectedRecord(connection, row);
        await this.reverifyFrozenSource(connection, row, job.creatorId);
        const project = await this.readBodyDirectedProject(
          connection,
          row,
          true
        );
        const metadata = parseJsonRecord(
          project.metadata_json,
          "The owned project metadata"
        );
        const current = this.parseHdJob(metadata.bodyCinemaHdRenderV1, record);
        if (
          current.id !== job.id ||
          current.status !== "rendering" ||
          current.recipeHash !== job.recipeHash
        )
          failure(
            "conflict",
            "The exact one-use HD render is no longer awaiting this output."
          );
        const assetId = randomUUID();
        await execute(
          connection,
          `INSERT INTO media_assets (id,user_id,source_type,asset_type,file_name,original_name,mime_type,file_size,storage_path,public_url,duration,width,height,status,created_by_feature) VALUES (?,?,'generated','video',?,?,'video/mp4',?,?,NULL,?,?,?,'ready','body_cinema_candidate')`,
          [
            assetId,
            job.creatorId,
            filename,
            filename,
            result.sizeBytes,
            `${CANDIDATE_PRIVATE_STORAGE_PREFIX}${pathId}`,
            result.durationSeconds,
            result.width,
            result.height,
          ]
        );
        const asset = await this.readAsset(
          connection,
          job.creatorId,
          assetId,
          false
        );
        const verified = await this.verifyPrivateCandidate(
          asset,
          job.creatorId,
          false
        );
        if (verified.snapshot.sha256 !== result.sha256)
          failure(
            "precondition",
            "The saved HD candidate bytes failed final receipt verification."
          );
        const next = bodyCinemaHdJobSchema.parse({
          ...current,
          status: "ready",
          completedAt: new Date().toISOString(),
          candidate: { assetId, ...result },
          error: null,
        });
        await this.saveHdJob(connection, row, metadata, next);
        await appendEvent(
          connection,
          row.project_id,
          job.creatorId,
          "body_cinema_hd_candidate_ready",
          {
            jobId: job.id,
            recipeHash: job.recipeHash,
            candidateAssetId: assetId,
            candidateSha256: result.sha256,
            sourceSha256: job.recipe.sourceSha256,
            ownerAcceptance: "not_reviewed",
            providerCallMade: false,
            externalCostUsd: 0,
          }
        );
      });
    } catch (error) {
      const message =
        error instanceof BodyCinemaLifecycleError
          ? error.message
          : error instanceof Error &&
              /^BODY_CINEMA_HD_[A-Z0-9_]+$/.test(error.message)
            ? error.message
            : "The bounded local HD export or verification failed. No candidate is offered and no automatic retry occurred.";
      await this.transaction(async connection => {
        const row = await this.lockBodyDirectedRow(
          connection,
          job.creatorId,
          job.lifecycleId
        );
        const record = await this.readBodyDirectedRecord(connection, row);
        const project = await this.readBodyDirectedProject(
          connection,
          row,
          true
        );
        const metadata = parseJsonRecord(
          project.metadata_json,
          "The owned project metadata"
        );
        const current = this.parseHdJob(metadata.bodyCinemaHdRenderV1, record);
        if (current.status !== "rendering" || current.id !== job.id) return;
        await this.saveHdJob(
          connection,
          row,
          metadata,
          bodyCinemaHdJobSchema.parse({
            ...current,
            status: "failed",
            completedAt: new Date().toISOString(),
            error: message.slice(0, 600),
            candidate: null,
          })
        );
        await appendEvent(
          connection,
          row.project_id,
          job.creatorId,
          "body_cinema_hd_render_failed",
          {
            jobId: job.id,
            noRetry: true,
            candidateOffered: false,
            error: message.slice(0, 600),
          }
        );
      }).catch(() => undefined);
      // Retain partial artifacts as private failure evidence. Never prune creator media, receipts or historical state.
    } finally {
      await source?.handle.close().catch(() => undefined);
    }
  }

  async openHdPlayback(input: {
    creatorId: number;
    id: string;
  }): Promise<BodyCinemaPlaybackArtifact> {
    const job = await this.getHdRender(input.creatorId, input.id);
    if (!job || job.status !== "ready" || !job.candidate)
      failure(
        "not_found",
        "No verified private HD candidate is ready for this creator."
      );
    const source = await this.openPlayback({
      creatorId: input.creatorId,
      id: input.id,
      artifact: "source",
    });
    await source.handle.close();
    const asset = await this.readAsset(
      this.pool,
      input.creatorId,
      job.candidate.assetId,
      false
    );
    const verified = await this.verifyPrivateCandidate(
      asset,
      input.creatorId,
      true
    );
    try {
      const receipt = await this.readCandidateReceipt(
        verified.snapshot.privatePathId
      );
      if (
        !verified.opened ||
        verified.snapshot.sha256 !== job.candidate.sha256 ||
        receipt.recipeHash !== job.recipeHash ||
        receipt.sourceHash !== job.recipe.sourceSha256 ||
        receipt.treatmentHash !== job.treatmentHash ||
        verified.snapshot.width !== job.recipe.width ||
        verified.snapshot.height !== job.recipe.height ||
        !sameDuration(
          verified.snapshot.durationSeconds,
          job.candidate.durationSeconds
        )
      )
        failure(
          "precondition",
          "The private HD candidate no longer matches its exact source, blueprint and verified receipt."
        );
      return {
        handle: verified.opened.handle,
        fileName: verified.snapshot.fileName,
        mimeType: "video/mp4",
        sizeBytes: verified.opened.sizeBytes,
      };
    } catch (error) {
      await verified.opened?.handle.close().catch(() => undefined);
      throw error;
    }
  }



  /** Versioned planning on the same lifecycle/project owners; no new schema. */
  async listBodyDirected(creatorId: number, limit = 30): Promise<BodyDirectedLifecycleRecord[]> {
    const rows = await queryRows<LifecycleRow>(this.pool,
      `SELECT * FROM body_cinema_candidate_lifecycles WHERE creator_id = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(rights_assertion_json, '$.version')) = ?
       ORDER BY updated_at DESC LIMIT ?`,
      [creatorId, BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION, Math.max(1, Math.min(100, Math.floor(limit)))]);
    return Promise.all(rows.map(row => this.readBodyDirectedRecord(this.pool, row)));
  }

  async getBodyDirected(creatorId: number, id: string): Promise<BodyDirectedLifecycleRecord | null> {
    const rows = await queryRows<LifecycleRow>(this.pool,
      'SELECT * FROM body_cinema_candidate_lifecycles WHERE id = ? AND creator_id = ? LIMIT 1', [id, creatorId]);
    return rows[0] && isBodyDirectedRow(rows[0]) ? this.readBodyDirectedRecord(this.pool, rows[0]) : null;
  }

  async qualifyBodyDirected(input: {creatorId: number; sourceAssetId: string; rights: BodyDirectedRightsInput}): Promise<BodyDirectedLifecycleRecord> {
    const declaration = bodyDirectedRightsInputSchema.parse(input.rights);
    const assertionHash = digest(declaration);
    const rights = bodyDirectedRightsSnapshotSchema.parse({ ...declaration,
      verificationStatus: 'creator_asserted_not_independently_verified', assertedAt: new Date().toISOString() });
    return this.transaction(async connection => {
      const asset = await this.lockAsset(connection, input.creatorId, input.sourceAssetId);
      const source = await this.verifyOriginalSource(asset, input.creatorId, false);
      const existing = await queryRows<LifecycleRow>(connection,
        'SELECT * FROM body_cinema_candidate_lifecycles WHERE creator_id = ? AND source_asset_id = ? FOR UPDATE',
        [input.creatorId, input.sourceAssetId]);
      if (existing[0]) {
        if (!isBodyDirectedRow(existing[0])) failure('conflict', 'An earlier saved record is linked to this original. It is not a Body Cinema edit treatment. Choose a different owned original; the saved record will not be overwritten.');
        if (existing[0].rights_assertion_hash !== assertionHash) failure('conflict', 'This source already has a different immutable creator declaration.');
        return this.readBodyDirectedRecord(connection, existing[0]);
      }
      const id = randomUUID(), projectId = randomUUID();
      await execute(connection,
        `INSERT INTO creation_projects
         (id, creator_id, title, intent, output_purpose, state, source_media_asset_id, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'ready_to_create', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        [projectId, input.creatorId, 'Body Cinema — body-directed cinematic plan',
         'Source-aware body focus, edit language and visual identity planning only.',
         'Private source analysis and immutable cinematic direction; no candidate or handoff authority.',
         input.sourceAssetId, JSON.stringify({feature:'body_cinema_candidate_lifecycle', sourceSha256:source.snapshot.sha256,
           rightsAssertionVersion:rights.version, bodyCinemaBodyDirectedV2:{version:'body_cinema.body_directed_metadata.v1', analysis:null}})]);
      await execute(connection,
        `INSERT INTO body_cinema_candidate_lifecycles
         (id, project_id, creator_id, source_asset_id, source_sha256, source_snapshot_json, rights_assertion_json, rights_assertion_hash, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'qualified', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        [id, projectId, input.creatorId, input.sourceAssetId, source.snapshot.sha256, JSON.stringify(source.snapshot), JSON.stringify(rights), assertionHash]);
      await appendEvent(connection, projectId, input.creatorId, 'body_cinema_body_directed_source_qualified',
        {lifecycleId:id, sourceAssetId:input.sourceAssetId, sourceSha256:source.snapshot.sha256,
         rightsAssertionVersion:rights.version, independentVerification:'not_claimed', executionAuthority:'none'});
      return this.readBodyDirectedRecord(connection, await this.lockBodyDirectedRow(connection, input.creatorId, id));
    });
  }

  async analyzeBodyDirected(input: {creatorId: number} & z.input<typeof bodyDirectedAnalyzeInputSchema>): Promise<BodyDirectedLifecycleRecord> {
    const parsed = bodyDirectedAnalyzeInputSchema.parse({id:input.id, sourceSha256:input.sourceSha256,
      frameEvidence:input.frameEvidence, detailObservations:input.detailObservations ?? []});
    return this.transaction(async connection => {
      const row = await this.lockBodyDirectedRow(connection, input.creatorId, parsed.id);
      if (row.state !== 'qualified' || row.treatment_hash) failure('conflict', 'The source map is immutable after this cinematic plan is locked.');
      const source = await this.reverifyFrozenSource(connection, row, input.creatorId);
      if (source.snapshot.sha256 !== parsed.sourceSha256.toLowerCase()) failure('precondition', 'The measurements do not match this exact verified original.');
      const map = deriveBodyDirectedSourceMap({ source:{assetId:source.snapshot.assetId, sha256:source.snapshot.sha256,
        width:source.snapshot.width, height:source.snapshot.height, durationSeconds:source.snapshot.durationSeconds},
        frameEvidence:parsed.frameEvidence, detailObservations:parsed.detailObservations });
      const analysis = bodyDirectedAnalysisSchema.parse({version:'body_cinema.body_directed_analysis.v1', sourceMap:map,
        sourceMapHash:digest(map), frameEvidence:parsed.frameEvidence, detailObservations:parsed.detailObservations});
      const project = await this.readBodyDirectedProject(connection, row, true);
      const metadata = parseJsonRecord(project.metadata_json, 'The creator project metadata');
      await execute(connection,
        'UPDATE creation_projects SET metadata_json = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND creator_id = ?',
        [bodyDirectedMetadataJson({...metadata, bodyCinemaBodyDirectedV2:{version:'body_cinema.body_directed_metadata.v1', analysis}}), row.project_id, input.creatorId]);
      await appendEvent(connection, row.project_id, input.creatorId, 'body_cinema_body_directed_source_mapped',
        {lifecycleId:row.id, sourceSha256:source.snapshot.sha256, sourceMapHash:analysis.sourceMapHash,
         observationProvenance:'creator_device_pose_and_creator_marks_not_independently_verified', executionAuthority:'none'});
      return this.readBodyDirectedRecord(connection, row);
    });
  }

  async recommendBodyDirected(input: {creatorId: number; id: string; bodyFocusId?: string; bodyTreatmentId?: string; visualIdentityId?: string}) {
    return this.transaction(async connection => {
      const row = await this.lockBodyDirectedRow(connection, input.creatorId, input.id);
      await this.reverifyFrozenSource(connection, row, input.creatorId);
      const record = await this.readBodyDirectedRecord(connection, row);
      if (record.treatment) return {options:[record.treatment], sourceMapHash:record.analysis?.sourceMapHash ?? null,
        reason:'This is your immutable saved plan, not a newly applied treatment.', alternatives:[], eligibleTreatmentIds:[record.treatment.bodyTreatment.id]};
      if (!record.analysis) return {options:[], sourceMapHash:null, reason:'Read the original before choosing a source-supported treatment.', alternatives:[], eligibleTreatmentIds:[] as string[]};
      const map = record.analysis.sourceMap;
      if (input.bodyFocusId && !BODY_FOCUS_LIBRARY.some(focus => focus.id === input.bodyFocusId)) failure('precondition', 'Choose one of the canonical body focuses.');
      const options = recommendBodyDirectedOptions(map, input.bodyFocusId);
      let reason: string | null = null;
      if (input.bodyFocusId && input.bodyTreatmentId && input.visualIdentityId) {
        try {
          const selected = compileBodyDirectedPlan(map, {bodyFocusId:input.bodyFocusId,
            bodyTreatmentId:input.bodyTreatmentId, visualIdentityId:input.visualIdentityId});
          const others = options.filter(plan => plan.bodyTreatment.id !== selected.bodyTreatment.id || plan.visualIdentity.id !== selected.visualIdentity.id);
          options.splice(0, options.length, selected, ...others.slice(0, 4));
        } catch (error) { reason = error instanceof Error ? error.message : 'This combination is not supported by the original.'; }
      }
      if (!options.length && !reason) reason = 'This focus is not confirmed in usable source ranges. Choose a measured focus or mark an actually visible detail in the original.';
      const supported = new Set(map.usableRanges.flatMap(range => range.visibleFocusIds));
      return {options, sourceMapHash:record.analysis.sourceMapHash, reason,
        alternatives:BODY_FOCUS_LIBRARY.filter(focus => supported.has(focus.id) && focus.id !== input.bodyFocusId).map(({id,label}) => ({id,label})),
        eligibleTreatmentIds: input.bodyFocusId ? BODY_FOCUS_TREATMENTS.filter(treatment =>
          assessBodyDirectedTreatment(map, input.bodyFocusId!, treatment.id).supported
        ).map(treatment => treatment.id) : []};
    });
  }

  async freezeBodyDirected(input: {creatorId: number} & z.input<typeof bodyDirectedFreezeInputSchema>): Promise<BodyDirectedLifecycleRecord> {
    const parsed = bodyDirectedFreezeInputSchema.parse({id:input.id, sourceMapHash:input.sourceMapHash,
      bodyFocusId:input.bodyFocusId, bodyTreatmentId:input.bodyTreatmentId, visualIdentityId:input.visualIdentityId,
      ...(input.selectedRangeIds ? {selectedRangeIds:input.selectedRangeIds} : {})});
    return this.transaction(async connection => {
      const row = await this.lockBodyDirectedRow(connection, input.creatorId, parsed.id);
      await this.reverifyFrozenSource(connection, row, input.creatorId);
      const record = await this.readBodyDirectedRecord(connection, row);
      const analysis = record.analysis;
      if (!analysis || analysis.sourceMapHash !== parsed.sourceMapHash) failure('conflict', 'The source map changed. Review the current options before locking this plan.');
      if (record.treatment) {
        const same = record.treatment.bodyFocus.id === parsed.bodyFocusId && record.treatment.bodyTreatment.id === parsed.bodyTreatmentId && record.treatment.visualIdentity.id === parsed.visualIdentityId;
        const selected = parsed.selectedRangeIds;
        const stored = record.treatment.selectedTimecodes.map(range => range.rangeId);
        if (same && (!selected || digest(selected) === digest(stored))) return record;
        failure('conflict', 'Your locked body-directed plan cannot be replaced or reinterpreted.');
      }
      if (row.state !== 'qualified') failure('conflict', 'Only a qualified original can lock its first cinematic plan.');
      const plan = compileBodyDirectedPlan(analysis.sourceMap, {bodyFocusId:parsed.bodyFocusId,
        bodyTreatmentId:parsed.bodyTreatmentId, visualIdentityId:parsed.visualIdentityId,
        ...(parsed.selectedRangeIds ? {selectedRangeIds:parsed.selectedRangeIds} : {})});
      const hash = digest(plan);
      await execute(connection,
        `UPDATE body_cinema_candidate_lifecycles SET treatment_version = ?, treatment_json = ?, treatment_hash = ?, state = 'frozen', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND creator_id = ?`,
        [plan.version, JSON.stringify(plan), hash, parsed.id, input.creatorId]);
      await execute(connection, 'UPDATE creation_projects SET treatment_id = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND creator_id = ?',
        [plan.bodyTreatment.id, row.project_id, input.creatorId]);
      await appendEvent(connection, row.project_id, input.creatorId, 'body_cinema_body_directed_plan_frozen',
        {lifecycleId:parsed.id, treatmentVersion:plan.version, treatmentHash:hash, sourceSha256:record.source.sha256,
         sourceMapHash:analysis.sourceMapHash, bodyFocusId:plan.bodyFocus.id, bodyTreatmentId:plan.bodyTreatment.id,
         visualIdentityId:plan.visualIdentity.id, executionAuthority:'none', candidateGenerated:false});
      return this.readBodyDirectedRecord(connection, await this.lockBodyDirectedRow(connection, input.creatorId, parsed.id));
    });
  }

  private async readBodyDirectedProject(executor: QueryExecutor, row: LifecycleRow, forUpdate = false) {
    const rows = await queryRows<ProjectRow & {metadata_json:unknown}>(executor,
      `SELECT id, creator_id, accepted_media_asset_id, metadata_json FROM creation_projects WHERE id = ? AND creator_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
      [row.project_id, Number(row.creator_id)]);
    if (!rows[0] || rows[0].accepted_media_asset_id) failure('precondition', 'The plan-only owned project is unavailable or has an invalid accepted asset.');
    return rows[0];
  }

  private async readBodyDirectedRecord(executor: QueryExecutor, row: LifecycleRow): Promise<BodyDirectedLifecycleRecord> {
    if (!isBodyDirectedRow(row)) failure('precondition', 'This is a preserved legacy lifecycle, not a body-directed plan.');
    if (row.candidate_asset_id || row.candidate_snapshot_json || row.candidate_sha256 || row.attachment_authorization_json || row.review_json || row.decision_json || row.handoff_json) failure('precondition', 'A body-directed plan cannot contain candidate or handoff execution state.');
    const source = parseStoredSource(row.source_snapshot_json);
    const rights = bodyDirectedRightsSnapshotSchema.parse(parseJsonRecord(row.rights_assertion_json, 'The plan-only creator declaration'));
    const {verificationStatus:_status, assertedAt:_time, ...rightsInput} = rights;
    if (digest(rightsInput) !== row.rights_assertion_hash) failure('precondition', 'The immutable creator declaration no longer matches its hash.');
    const project = await this.readBodyDirectedProject(executor, row);
    const metadata = parseJsonRecord(project.metadata_json, 'The project metadata');
    const namespace = parseJsonRecord(metadata.bodyCinemaBodyDirectedV2, 'The body-directed source map');
    const analysis = namespace.analysis ? bodyDirectedAnalysisSchema.parse(namespace.analysis) : null;
    const plan = row.treatment_json ? bodyDirectedPlanSchema.parse(parseJsonRecord(row.treatment_json, 'The frozen body-directed plan')) : null;
    if (plan && (digest(plan) !== row.treatment_hash || plan.version !== row.treatment_version || digest(plan.source) !== digest({assetId:source.assetId, sha256:source.sha256,width:source.width,height:source.height,durationSeconds:source.durationSeconds}))) failure('precondition', 'The saved cinematic plan no longer matches its immutable source and hash.');
    if (analysis && (digest(analysis.sourceMap) !== analysis.sourceMapHash || analysis.sourceMap.source.sha256 !== source.sha256 || analysis.sourceMap.source.assetId !== source.assetId)) failure('precondition', 'The saved source map no longer matches this original and its snapshot hash.');
    if (plan && (!analysis || digest(plan.sourceMap) !== analysis.sourceMapHash)) failure('precondition', 'The frozen source map is not the immutable selected snapshot.');
    if ((row.state === 'frozen') !== Boolean(plan)) failure('precondition', 'The plan-only lifecycle state does not match its immutable snapshot.');
    return bodyDirectedLifecycleRecordSchema.parse({id:row.id, projectId:row.project_id, creatorId:Number(row.creator_id), kind:'body_directed_v2',
      state:row.state, source:publicSourceSnapshot(source), rights, analysis, treatment:plan, treatmentHash:valueOrNull(row.treatment_hash),
      candidate:null,handoff:null,createdAt:toIso(row.created_at,'The lifecycle creation time'),updatedAt:toIso(row.updated_at,'The lifecycle update time')});
  }

  private async lockBodyDirectedRow(connection: PoolConnection, creatorId: number, id: string): Promise<LifecycleRow> {
    const row = await this.lockLifecycleRow(connection, creatorId, id, true);
    if (!isBodyDirectedRow(row)) failure('precondition', 'This source belongs to a preserved legacy plan.');
    return row;
  }


  async listMine(
    creatorId: number,
    limit = 30
  ): Promise<BodyCinemaLifecycleRecord[]> {
    const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = await queryRows<LifecycleRow>(
      this.pool,
      `SELECT * FROM body_cinema_candidate_lifecycles
       WHERE creator_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(rights_assertion_json, '$.version')) <> ?
       ORDER BY updated_at DESC LIMIT ?`,
      [creatorId, BODY_CINEMA_BODY_DIRECTED_ASSERTION_VERSION, bounded]
    );
    return rows.map(parseLifecycle);
  }

  async getMine(
    creatorId: number,
    id: string
  ): Promise<BodyCinemaLifecycleRecord | null> {
    const rows = await queryRows<LifecycleRow>(
      this.pool,
      `SELECT * FROM body_cinema_candidate_lifecycles
       WHERE id = ? AND creator_id = ? LIMIT 1`,
      [id, creatorId]
    );
    return rows[0] && !isBodyDirectedRow(rows[0]) ? parseLifecycle(rows[0]) : null;
  }

  async qualify(input: {
    creatorId: number;
    sourceAssetId: string;
    rights: BodyCinemaCreatorRightsInput;
  }): Promise<BodyCinemaLifecycleRecord> {
    const rightsHash = digest(input.rights);
    const rights = bodyCinemaCreatorRightsSnapshotSchema.parse({
      ...input.rights,
      verificationStatus: "creator_asserted_not_independently_verified",
      assertedAt: new Date().toISOString(),
    });
    return this.transaction(async connection => {
      const asset = await this.lockAsset(
        connection,
        input.creatorId,
        input.sourceAssetId
      );
      const verifiedSource = await this.verifyOriginalSource(
        asset,
        input.creatorId,
        false
      );
      const existingRows = await queryRows<LifecycleRow>(
        connection,
        `SELECT * FROM body_cinema_candidate_lifecycles
         WHERE creator_id = ? AND source_asset_id = ? FOR UPDATE`,
        [input.creatorId, input.sourceAssetId]
      );
      if (existingRows[0]) {
        if (
          normalizeText(existingRows[0].rights_assertion_hash) !== rightsHash
        ) {
          failure(
            "conflict",
            "This source already has a lifecycle with an immutable creator assertion."
          );
        }
        return parseLifecycle(existingRows[0]);
      }
      const projectId = randomUUID();
      const lifecycleId = randomUUID();
      await execute(
        connection,
        `INSERT INTO creation_projects
          (id, creator_id, title, intent, output_purpose, state, source_media_asset_id, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'ready_to_create', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        [
          projectId,
          input.creatorId,
          "Body Cinema — Crown Reveal",
          "One source-specific, creator-approved Crown Reveal candidate lifecycle.",
          "Private candidate review and accepted-master-only Trailer Maker planning.",
          input.sourceAssetId,
          JSON.stringify({
            feature: "body_cinema_candidate_lifecycle",
            status: "qualified",
            sourceSha256: verifiedSource.snapshot.sha256,
            rightsAssertionVersion: rights.version,
          }),
        ]
      );
      await execute(
        connection,
        `INSERT INTO body_cinema_candidate_lifecycles
          (id, project_id, creator_id, source_asset_id, source_sha256, source_snapshot_json,
           rights_assertion_json, rights_assertion_hash, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'qualified', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        [
          lifecycleId,
          projectId,
          input.creatorId,
          input.sourceAssetId,
          verifiedSource.snapshot.sha256,
          JSON.stringify(verifiedSource.snapshot),
          JSON.stringify(rights),
          rightsHash,
        ]
      );
      await appendEvent(
        connection,
        projectId,
        input.creatorId,
        "creation_opened",
        {
          lifecycleId,
          lifecycle: "body_cinema_candidate",
          sourceAssetId: input.sourceAssetId,
          sourceSha256: verifiedSource.snapshot.sha256,
          state: "qualified",
        }
      );
      await appendEvent(
        connection,
        projectId,
        input.creatorId,
        "body_cinema_source_qualified",
        {
          lifecycleId,
          sourceAssetId: input.sourceAssetId,
          sourceSha256: verifiedSource.snapshot.sha256,
          rightsAssertionVersion: rights.version,
          independentVerification: "not_claimed",
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, lifecycleId);
    });
  }

  async freeze(input: {
    creatorId: number;
    id: string;
    treatment: BodyCinemaCrownRevealTreatment;
  }): Promise<BodyCinemaLifecycleRecord> {
    const treatment = bodyCinemaCrownRevealTreatmentSchema.parse(
      input.treatment
    );
    return this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      validateTreatment(treatment, source.snapshot);
      const treatmentHash = digest(treatment);
      if (lifecycle.treatment_hash) {
        if (normalizeText(lifecycle.treatment_hash) === treatmentHash)
          return parseLifecycle(lifecycle);
        failure(
          "conflict",
          "The Crown Reveal treatment is immutable after it has been frozen."
        );
      }
      if (lifecycle.state !== "qualified") {
        failure(
          "conflict",
          "Only a qualified source can freeze its first Crown Reveal treatment."
        );
      }
      await execute(
        connection,
        `UPDATE body_cinema_candidate_lifecycles
         SET treatment_version = ?, treatment_json = ?, treatment_hash = ?, state = 'frozen', updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ?`,
        [
          treatment.version,
          JSON.stringify(treatment),
          treatmentHash,
          input.id,
          input.creatorId,
        ]
      );
      await execute(
        connection,
        `UPDATE creation_projects SET treatment_id = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ?`,
        [input.id, lifecycle.project_id, input.creatorId]
      );
      await appendEvent(
        connection,
        lifecycle.project_id,
        input.creatorId,
        "body_cinema_treatment_frozen",
        {
          lifecycleId: input.id,
          treatmentVersion: treatment.version,
          treatmentHash,
          sourceSha256: source.snapshot.sha256,
          proposedOutput: treatment.proposedOutput,
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, input.id);
    });
  }

  async reserve(input: {
    creatorId: number;
    id: string;
  }): Promise<BodyCinemaLifecycleRecord> {
    return this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      await this.reverifyFrozenSource(connection, lifecycle, input.creatorId);
      if (lifecycle.state === "awaiting_candidate")
        return parseLifecycle(lifecycle);
      if (lifecycle.state !== "frozen") {
        failure(
          "conflict",
          "Only a frozen treatment can reserve its one candidate slot."
        );
      }
      await execute(
        connection,
        `UPDATE body_cinema_candidate_lifecycles
         SET state = 'awaiting_candidate', updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ?`,
        [input.id, input.creatorId]
      );
      await appendEvent(
        connection,
        lifecycle.project_id,
        input.creatorId,
        "body_cinema_candidate_slot_reserved",
        {
          lifecycleId: input.id,
          sourceSha256: lifecycle.source_sha256,
          treatmentHash: lifecycle.treatment_hash,
          slotCount: 1,
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, input.id);
    });
  }

  /**
   * Server-only ingress for a FUTURE separately authorized owner pilot.
   * Not mounted on tRPC/HTTP; this phase never calls it in production.
   * An owner-controlled approval file must already exist. Grant bytes are written
   * before DB commit; crash/retry can finish only the same grant. Neither a lone
   * sidecar nor a lone DB value authorizes attach(), which requires both.
   */
  async authorizeFutureAttachment(input: {
    creatorId: number;
    id: string;
  }): Promise<void> {
    const roots = storageRoots();
    if (!roots.localProof && process.getuid?.() !== 0) {
      failure(
        "forbidden",
        "Future pilot grants require the root-owned approval boundary."
      );
    }
    await this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      if (
        lifecycle.state !== "awaiting_candidate" ||
        lifecycle.candidate_asset_id ||
        !lifecycle.treatment_hash
      ) {
        failure(
          "conflict",
          "Only the existing unfilled reserved slot can receive a future pilot grant."
        );
      }
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      const directory = await lstat(roots.candidateRoot);
      if (
        !directory.isDirectory() ||
        directory.isSymbolicLink() ||
        directory.uid !== process.getuid?.() ||
        (directory.mode & 0o077) !== 0
      ) {
        failure(
          "forbidden",
          "The future owner-pilot approval directory is not private trusted storage."
        );
      }
      const approvalPath = path.join(
        roots.candidateRoot,
        `${lifecycle.id}.pilot-approval.json`
      );
      const handle = await open(
        approvalPath,
        constants.O_RDONLY | constants.O_NOFOLLOW
      ).catch(() => null);
      if (!handle)
        failure(
          "forbidden",
          "A separately authorized exact owner-pilot approval is required."
        );
      let approval: Record<string, unknown>;
      try {
        const status = await handle.stat();
        if (
          !status.isFile() ||
          status.nlink !== 1 ||
          status.uid !== process.getuid?.() ||
          (status.mode & 0o777) !== 0o600 ||
          status.size < 2 ||
          status.size > 65536
        ) {
          failure(
            "forbidden",
            "The exact owner-pilot approval file is not trusted."
          );
        }
        approval = parseJsonRecord(
          await handle.readFile({ encoding: "utf8" }),
          "The owner-pilot approval"
        );
      } finally {
        await handle.close();
      }
      if (
        approval.version !== "body_cinema.owner_pilot_approval.v1" ||
        approval.scope !== "one_candidate_attachment_only" ||
        approval.creatorId !== input.creatorId ||
        approval.lifecycleId !== lifecycle.id
      ) {
        failure(
          "forbidden",
          "The owner-pilot approval does not authorize this creator and slot."
        );
      }
      const grant = futureAttachmentGrantSchema.parse({
        version: BODY_CINEMA_FUTURE_ATTACHMENT_GRANT_VERSION,
        lifecycleId: lifecycle.id,
        issuerId: approval.issuerId,
        authorizationRef: approval.authorizationRef,
        sourceHash: approval.sourceHash,
        treatmentHash: approval.treatmentHash,
        candidateAssetId: approval.candidateAssetId,
        candidateHash: approval.candidateHash,
        provenanceReference: approval.provenanceReference,
        privatePathId: approval.privatePathId,
        expiresAt: approval.expiresAt,
        singleUseState: "available",
      });
      if (
        grant.sourceHash !== source.snapshot.sha256 ||
        grant.treatmentHash !== lifecycle.treatment_hash ||
        new Date(grant.expiresAt).getTime() <= Date.now()
      ) {
        failure(
          "forbidden",
          "The future approval is expired or names different frozen source/treatment bytes."
        );
      }
      const asset = await this.lockAsset(
        connection,
        input.creatorId,
        grant.candidateAssetId
      );
      const candidate = await this.verifyPrivateCandidate(
        asset,
        input.creatorId,
        false
      );
      const receipt = await this.readCandidateReceipt(
        candidate.snapshot.privatePathId
      );
      if (
        candidate.snapshot.sha256 !== grant.candidateHash ||
        candidate.snapshot.privatePathId !== grant.privatePathId ||
        receiptText(receipt, "sourceHash") !== grant.sourceHash ||
        receiptText(receipt, "treatmentHash") !== grant.treatmentHash
      ) {
        failure(
          "forbidden",
          "The future approval does not match the exact owned private candidate receipt and bytes."
        );
      }
      const treatment = bodyCinemaCrownRevealTreatmentSchema.parse(
        parseJsonRecord(lifecycle.treatment_json, "The frozen treatment")
      );
      this.assertCandidateMatchesTreatment(candidate.snapshot, treatment);
      if (lifecycle.attachment_authorization_json) {
        const existing = futureAttachmentGrantSchema.parse(
          parseJsonRecord(
            lifecycle.attachment_authorization_json,
            "The recorded future grant"
          )
        );
        if (digest(existing) !== digest(grant))
          failure(
            "conflict",
            "A future slot authorization cannot be replaced."
          );
      }
      const grantPath = path.join(
        roots.candidateRoot,
        `${grant.privatePathId}.grant.json`
      );
      let created: FileHandle | null = null;
      try {
        created = await open(
          grantPath,
          constants.O_WRONLY |
            constants.O_CREAT |
            constants.O_EXCL |
            constants.O_NOFOLLOW,
          0o600
        );
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "EEXIST"
        )
          throw error;
      }
      if (created) {
        try {
          await created.writeFile(JSON.stringify(grant));
          await created.sync();
        } finally {
          await created.close();
        }
      } else if (
        digest(await readTrustedAttachmentGrant(grant.privatePathId)) !==
        digest(grant)
      ) {
        failure("conflict", "The existing protected grant cannot be replaced.");
      }
      const directoryHandle = await open(
        roots.candidateRoot,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
      );
      try {
        await directoryHandle.sync();
      } finally {
        await directoryHandle.close();
      }
      if (!lifecycle.attachment_authorization_json) {
        await execute(
          connection,
          "UPDATE body_cinema_candidate_lifecycles SET attachment_authorization_json = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND creator_id = ? AND candidate_asset_id IS NULL",
          [JSON.stringify(grant), lifecycle.id, input.creatorId]
        );
        await appendEvent(
          connection,
          lifecycle.project_id,
          input.creatorId,
          "body_cinema_future_attachment_authorized",
          {
            lifecycleId: lifecycle.id,
            authorizationRef: grant.authorizationRef,
            sourceHash: grant.sourceHash,
            treatmentHash: grant.treatmentHash,
            candidateHash: grant.candidateHash,
          }
        );
      }
    });
  }

  async attach(input: {
    creatorId: number;
    id: string;
    candidateAssetId: string;
    provenanceReference: string;
    expectedSha256: string;
  }): Promise<BodyCinemaLifecycleRecord> {
    return this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      if (lifecycle.candidate_asset_id) {
        if (
          lifecycle.candidate_asset_id === input.candidateAssetId &&
          normalizeText(lifecycle.candidate_sha256).toLowerCase() ===
            input.expectedSha256.toLowerCase()
        ) {
          return parseLifecycle(lifecycle);
        }
        failure(
          "conflict",
          "This lifecycle already has its only candidate attachment; replacement is forbidden."
        );
      }
      if (lifecycle.state !== "awaiting_candidate") {
        failure(
          "conflict",
          "The candidate slot is not awaiting its separately authorized attachment."
        );
      }
      if (!lifecycle.treatment_hash || !lifecycle.treatment_json) {
        failure(
          "precondition",
          "A frozen treatment is required before candidate attachment."
        );
      }
      const treatment = bodyCinemaCrownRevealTreatmentSchema.parse(
        parseJsonRecord(lifecycle.treatment_json, "The frozen treatment")
      );
      const grant = await this.requireAvailableAttachmentGrant(
        lifecycle,
        input,
        source.snapshot
      );
      const candidateAsset = await this.lockAsset(
        connection,
        input.creatorId,
        input.candidateAssetId
      );
      const candidate = await this.verifyPrivateCandidate(
        candidateAsset,
        input.creatorId,
        false
      );
      const candidateReceipt = await this.readCandidateReceipt(
        candidate.snapshot.privatePathId
      );
      if (
        receiptText(candidateReceipt, "sourceHash").toLowerCase() !==
          source.snapshot.sha256.toLowerCase() ||
        receiptText(candidateReceipt, "treatmentHash").toLowerCase() !==
          lifecycle.treatment_hash.toLowerCase()
      ) {
        failure(
          "precondition",
          "The private candidate receipt is not bound to this exact source and frozen treatment."
        );
      }
      this.assertCandidateMatchesTreatment(candidate.snapshot, treatment);
      if (
        candidate.snapshot.sha256.toLowerCase() !==
        input.expectedSha256.toLowerCase()
      ) {
        failure(
          "precondition",
          "The attached candidate bytes do not match the caller's expected SHA-256."
        );
      }
      if (
        candidate.snapshot.sha256.toLowerCase() !==
        grant.candidateHash.toLowerCase()
      ) {
        failure(
          "precondition",
          "The future attachment grant does not authorize these candidate bytes."
        );
      }
      if (candidate.snapshot.privatePathId !== grant.privatePathId) {
        failure(
          "precondition",
          "The future attachment grant does not authorize this private candidate location."
        );
      }
      const provenance = bodyCinemaCandidateProvenanceSchema.parse({
        provenanceReference: input.provenanceReference,
        sourceHash: source.snapshot.sha256,
        treatmentHash: lifecycle.treatment_hash,
        candidateHash: candidate.snapshot.sha256,
        attachmentAuthorizationRef: grant.authorizationRef,
        attachedAt: new Date().toISOString(),
      });
      const consumedGrant: FutureAttachmentGrant = {
        ...grant,
        singleUseState: "consumed",
        consumedAt: new Date().toISOString(),
      };
      await execute(
        connection,
        `UPDATE body_cinema_candidate_lifecycles
         SET candidate_asset_id = ?, candidate_sha256 = ?, candidate_snapshot_json = ?,
             candidate_provenance_json = ?, attachment_authorization_json = ?,
             state = 'candidate_attached', updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ? AND candidate_asset_id IS NULL`,
        [
          input.candidateAssetId,
          candidate.snapshot.sha256,
          JSON.stringify(candidate.snapshot),
          JSON.stringify(provenance),
          JSON.stringify(consumedGrant),
          input.id,
          input.creatorId,
        ]
      );
      await appendEvent(
        connection,
        lifecycle.project_id,
        input.creatorId,
        "body_cinema_candidate_attached",
        {
          lifecycleId: input.id,
          candidateAssetId: input.candidateAssetId,
          candidateSha256: candidate.snapshot.sha256,
          sourceSha256: source.snapshot.sha256,
          treatmentHash: lifecycle.treatment_hash,
          attachmentAuthorizationRef: grant.authorizationRef,
          privateArtifact: true,
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, input.id);
    });
  }

  async beginReview(input: {
    creatorId: number;
    id: string;
  }): Promise<BodyCinemaLifecycleRecord> {
    return this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      if (
        lifecycle.state !== "candidate_attached" &&
        lifecycle.state !== "review_in_progress"
      ) {
        failure(
          "conflict",
          "A real attached candidate is required before review can begin."
        );
      }
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      const candidate = await this.reverifyAttachedCandidate(
        connection,
        lifecycle,
        input.creatorId
      );
      if (lifecycle.state === "review_in_progress")
        return parseLifecycle(lifecycle);
      const review = bodyCinemaReviewSchema.parse({
        id: randomUUID(),
        startedAt: new Date().toISOString(),
        sourceHash: source.snapshot.sha256,
        candidateHash: candidate.snapshot.sha256,
        source: publicSourceSnapshot(source.snapshot),
        candidate: publicCandidateSnapshot(candidate.snapshot),
      });
      await execute(
        connection,
        `UPDATE body_cinema_candidate_lifecycles
         SET review_id = ?, review_json = ?, state = 'review_in_progress', updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ?`,
        [review.id, JSON.stringify(review), input.id, input.creatorId]
      );
      await appendEvent(
        connection,
        lifecycle.project_id,
        input.creatorId,
        "body_cinema_review_started",
        {
          lifecycleId: input.id,
          reviewId: review.id,
          playbackStartedAt: review.startedAt,
          sourceSha256: review.sourceHash,
          candidateSha256: review.candidateHash,
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, input.id);
    });
  }

  async decide(input: {
    creatorId: number;
    id: string;
    reviewId: string;
    candidateSha256: string;
    decision: "accept" | "reject";
    reason: string;
    watchedEntireCandidate: true;
  }): Promise<BodyCinemaLifecycleRecord> {
    return this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      const candidate = await this.reverifyAttachedCandidate(
        connection,
        lifecycle,
        input.creatorId
      );
      const existingDecision = lifecycle.decision_json
        ? bodyCinemaDecisionSchema.parse(
            parseJsonRecord(lifecycle.decision_json, "The saved decision")
          )
        : null;
      if (existingDecision) {
        if (
          existingDecision.decision === input.decision &&
          existingDecision.reviewId === input.reviewId &&
          existingDecision.candidateHash.toLowerCase() ===
            input.candidateSha256.toLowerCase() &&
          existingDecision.reason === input.reason
        ) {
          return parseLifecycle(lifecycle);
        }
        failure(
          "conflict",
          "A different creator decision already closes this candidate lifecycle."
        );
      }
      if (lifecycle.state !== "review_in_progress" || !lifecycle.review_json) {
        failure(
          "conflict",
          "Start an immutable candidate review before recording a creator decision."
        );
      }
      const review = bodyCinemaReviewSchema.parse(
        parseJsonRecord(lifecycle.review_json, "The immutable review")
      );
      if (
        review.id !== input.reviewId ||
        review.candidateHash.toLowerCase() !==
          input.candidateSha256.toLowerCase() ||
        review.candidateHash.toLowerCase() !==
          candidate.snapshot.sha256.toLowerCase() ||
        review.sourceHash.toLowerCase() !== source.snapshot.sha256.toLowerCase()
      ) {
        failure(
          "precondition",
          "The decision does not match the exact review and current source/candidate bytes."
        );
      }
      if (input.watchedEntireCandidate !== true) {
        failure(
          "precondition",
          "The creator must explicitly confirm full candidate playback before deciding."
        );
      }
      const elapsedMs = Date.now() - new Date(review.startedAt).getTime();
      const requiredMs = Math.ceil(candidate.snapshot.durationSeconds * 1000);
      if (!Number.isFinite(elapsedMs) || elapsedMs < requiredMs) {
        failure(
          "precondition",
          "The candidate review has not remained open for the full verified playback duration."
        );
      }
      const decision = bodyCinemaDecisionSchema.parse({
        id: randomUUID(),
        decision: input.decision,
        reviewId: review.id,
        reason: input.reason,
        candidateHash: candidate.snapshot.sha256,
        sourceHash: source.snapshot.sha256,
        decidedAt: new Date().toISOString(),
      });
      if (input.decision === "accept") {
        const projectRows = await queryRows<ProjectRow>(
          connection,
          `SELECT id, creator_id, accepted_media_asset_id FROM creation_projects
           WHERE id = ? AND creator_id = ? FOR UPDATE`,
          [lifecycle.project_id, input.creatorId]
        );
        const project = projectRows[0];
        if (!project)
          failure(
            "not_found",
            "The lifecycle Creation Project is no longer available."
          );
        if (
          project.accepted_media_asset_id &&
          project.accepted_media_asset_id !== lifecycle.candidate_asset_id
        ) {
          failure(
            "conflict",
            "This Creation Project already has a different accepted master pointer."
          );
        }
        await execute(
          connection,
          `UPDATE creation_projects
           SET accepted_media_asset_id = ?, state = 'creator_review', updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ? AND creator_id = ?`,
          [lifecycle.candidate_asset_id, lifecycle.project_id, input.creatorId]
        );
      } else {
        await execute(
          connection,
          `UPDATE creation_projects SET state = 'blocked', updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ? AND creator_id = ?`,
          [lifecycle.project_id, input.creatorId]
        );
      }
      await execute(
        connection,
        `UPDATE body_cinema_candidate_lifecycles
         SET decision_json = ?, state = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ?`,
        [
          JSON.stringify(decision),
          input.decision === "accept" ? "accepted" : "rejected",
          input.id,
          input.creatorId,
        ]
      );
      await appendEvent(
        connection,
        lifecycle.project_id,
        input.creatorId,
        "body_cinema_creator_decision",
        {
          lifecycleId: input.id,
          decisionId: decision.id,
          decision: decision.decision,
          reviewId: decision.reviewId,
          sourceSha256: decision.sourceHash,
          candidateSha256: decision.candidateHash,
          acceptedMasterAssetId:
            input.decision === "accept" ? lifecycle.candidate_asset_id : null,
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, input.id);
    });
  }

  async handoff(input: {
    creatorId: number;
    id: string;
  }): Promise<BodyCinemaLifecycleRecord> {
    return this.transaction(async connection => {
      const lifecycle = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      if (lifecycle.handoff_json) {
        const existingHandoff = bodyCinemaHandoffSchema.parse(
          parseJsonRecord(
            lifecycle.handoff_json,
            "The saved Body Cinema handoff"
          )
        );
        const existingDecision = lifecycle.decision_json
          ? bodyCinemaDecisionSchema.parse(
              parseJsonRecord(
                lifecycle.decision_json,
                "The saved accepted decision"
              )
            )
          : null;
        const source = await this.reverifyFrozenSource(
          connection,
          lifecycle,
          input.creatorId
        );
        const candidate = await this.reverifyAttachedCandidate(
          connection,
          lifecycle,
          input.creatorId
        );
        const projectRows = await queryRows<ProjectRow>(
          connection,
          `SELECT id, creator_id, accepted_media_asset_id FROM creation_projects
           WHERE id = ? AND creator_id = ? FOR UPDATE`,
          [lifecycle.project_id, input.creatorId]
        );
        if (
          lifecycle.state !== "handoff_ready" ||
          !existingDecision ||
          existingDecision.decision !== "accept" ||
          existingDecision.id !== existingHandoff.decisionId ||
          projectRows[0]?.accepted_media_asset_id !==
            lifecycle.candidate_asset_id ||
          existingHandoff.sourceHash.toLowerCase() !==
            source.snapshot.sha256.toLowerCase() ||
          existingHandoff.candidateHash.toLowerCase() !==
            candidate.snapshot.sha256.toLowerCase()
        ) {
          failure(
            "precondition",
            "The saved Trailer Maker handoff no longer matches its accepted source, candidate, and decision evidence."
          );
        }
        return parseLifecycle(lifecycle);
      }
      if (
        lifecycle.state !== "accepted" ||
        !lifecycle.decision_json ||
        !lifecycle.candidate_asset_id
      ) {
        failure(
          "conflict",
          "Only an accepted exact candidate master can enter Trailer Maker planning."
        );
      }
      const decision = bodyCinemaDecisionSchema.parse(
        parseJsonRecord(lifecycle.decision_json, "The accepted decision")
      );
      if (decision.decision !== "accept") {
        failure(
          "conflict",
          "A rejected candidate cannot enter Trailer Maker planning."
        );
      }
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      const candidate = await this.reverifyAttachedCandidate(
        connection,
        lifecycle,
        input.creatorId
      );
      const projectRows = await queryRows<ProjectRow>(
        connection,
        `SELECT id, creator_id, accepted_media_asset_id FROM creation_projects
         WHERE id = ? AND creator_id = ? FOR UPDATE`,
        [lifecycle.project_id, input.creatorId]
      );
      if (
        projectRows[0]?.accepted_media_asset_id !== lifecycle.candidate_asset_id
      ) {
        failure(
          "precondition",
          "The Creation Project no longer points at this exact accepted candidate master."
        );
      }
      const treatment = bodyCinemaCrownRevealTreatmentSchema.parse(
        parseJsonRecord(lifecycle.treatment_json, "The frozen treatment")
      );
      const sourceTitle =
        source.snapshot.fileName.replace(/\.[^.]+$/, "").slice(0, 120) ||
        "Creator source";
      const moment = `${treatment.sourceMoment.startSeconds.toFixed(1)}s–${treatment.sourceMoment.endSeconds.toFixed(1)}s`;
      const focus = treatment.bodyFaceEmphasis.join(" + ");
      const hooks = [
        `${sourceTitle}: ${treatment.hook}`.slice(0, 300),
        `Crown Reveal at ${moment}: ${treatment.feeling}`.slice(0, 300),
        `Hold the creator-approved ${focus} moment; ${treatment.ending}`.slice(
          0,
          300
        ),
      ];
      const captionDirection = `Planning only. Preserve original audio and the frozen Crown Reveal source moment (${moment}); use ${treatment.typography} No publication, export, or performance claim is authorized.`;
      const trailerProjectId = randomUUID();
      const scenes = [
        {
          plan: "teaser",
          durationSeconds: 3,
          role: "hook",
          sourceMoment: treatment.sourceMoment,
          direction: treatment.opening,
        },
        {
          plan: "teaser",
          durationSeconds: 5,
          role: "hold",
          sourceMoment: treatment.sourceMoment,
          direction: treatment.hook,
        },
        {
          plan: "reel",
          durationSeconds: 6,
          role: "build",
          sourceMoment: treatment.sourceMoment,
          direction: treatment.naturalRhythm,
        },
        {
          plan: "reel",
          durationSeconds: 6,
          role: "ending",
          sourceMoment: treatment.sourceMoment,
          direction: treatment.ending,
        },
      ];
      await execute(
        connection,
        `INSERT INTO trailer_projects
          (id, user_id, project_name, project_type, title, concept, script_text, format,
           source_asset_id, scenes_json, hooks, hook_variants, status)
         VALUES (?, ?, ?, 'body_cinema_handoff', ?, ?, ?, '9:16', ?, ?, ?, ?, 'draft')`,
        [
          trailerProjectId,
          input.creatorId,
          `Body Cinema Crown Reveal — ${sourceTitle}`.slice(0, 200),
          `Accepted candidate plan from Body Cinema lifecycle ${lifecycle.id}`.slice(
            0,
            300
          ),
          `Crown Reveal plan: ${treatment.feeling}`.slice(0, 1000),
          captionDirection.slice(0, 4000),
          lifecycle.candidate_asset_id,
          JSON.stringify(scenes),
          JSON.stringify(hooks),
          JSON.stringify(hooks),
        ]
      );
      const handoff = bodyCinemaHandoffSchema.parse({
        trailerProjectId,
        decisionId: decision.id,
        createdAt: new Date().toISOString(),
        sourceAssetId: lifecycle.source_asset_id,
        candidateAssetId: lifecycle.candidate_asset_id,
        sourceHash: source.snapshot.sha256,
        candidateHash: candidate.snapshot.sha256,
        treatmentVersion: BODY_CINEMA_CROWN_REVEAL_TREATMENT_VERSION,
        teaserPlanSeconds: 8,
        reelPlanSeconds: 12,
        hooks,
        captionDirection,
        status: "planning_only",
      });
      await execute(
        connection,
        `UPDATE body_cinema_candidate_lifecycles
         SET handoff_json = ?, state = 'handoff_ready', updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND creator_id = ?`,
        [JSON.stringify(handoff), input.id, input.creatorId]
      );
      await appendEvent(
        connection,
        lifecycle.project_id,
        input.creatorId,
        "body_cinema_trailer_handoff_planned",
        {
          lifecycleId: input.id,
          trailerProjectId,
          decisionId: decision.id,
          sourceSha256: source.snapshot.sha256,
          candidateSha256: candidate.snapshot.sha256,
          treatmentVersion: treatment.version,
          status: "planning_only",
        }
      );
      return this.lockLifecycleRecord(connection, input.creatorId, input.id);
    });
  }

  async getHandoff(input: {
    creatorId: number;
    handoffId: string;
  }): Promise<
    { lifecycleId: string } & z.infer<typeof bodyCinemaHandoffSchema>
  > {
    return this.transaction(async connection => {
      const rows = await queryRows<LifecycleRow>(
        connection,
        `SELECT * FROM body_cinema_candidate_lifecycles
         WHERE creator_id = ?
           AND JSON_UNQUOTE(JSON_EXTRACT(handoff_json, '$.trailerProjectId')) = ?
         LIMIT 1 FOR UPDATE`,
        [input.creatorId, input.handoffId]
      );
      const lifecycle = rows[0];
      if (
        !lifecycle ||
        !lifecycle.handoff_json ||
        !lifecycle.candidate_asset_id
      ) {
        failure(
          "not_found",
          "This Body Cinema Trailer Maker handoff is unavailable."
        );
      }
      if (lifecycle.state !== "handoff_ready" || !lifecycle.decision_json) {
        failure(
          "precondition",
          "This Body Cinema candidate has not completed its accepted planning handoff."
        );
      }
      const handoff = bodyCinemaHandoffSchema.parse(
        parseJsonRecord(lifecycle.handoff_json, "The Body Cinema handoff")
      );
      const decision = bodyCinemaDecisionSchema.parse(
        parseJsonRecord(lifecycle.decision_json, "The accepted decision")
      );
      if (
        decision.decision !== "accept" ||
        decision.id !== handoff.decisionId
      ) {
        failure(
          "precondition",
          "The Trailer Maker handoff is not bound to an exact accepted creator decision."
        );
      }
      const source = await this.reverifyFrozenSource(
        connection,
        lifecycle,
        input.creatorId
      );
      const candidate = await this.reverifyAttachedCandidate(
        connection,
        lifecycle,
        input.creatorId
      );
      if (
        handoff.sourceAssetId !== lifecycle.source_asset_id ||
        handoff.candidateAssetId !== lifecycle.candidate_asset_id ||
        handoff.sourceHash.toLowerCase() !==
          source.snapshot.sha256.toLowerCase() ||
        handoff.candidateHash.toLowerCase() !==
          candidate.snapshot.sha256.toLowerCase() ||
        decision.sourceHash.toLowerCase() !==
          source.snapshot.sha256.toLowerCase() ||
        decision.candidateHash.toLowerCase() !==
          candidate.snapshot.sha256.toLowerCase()
      ) {
        failure(
          "precondition",
          "The Trailer Maker handoff no longer matches its accepted source, candidate, and decision bytes."
        );
      }
      const projectRows = await queryRows<ProjectRow>(
        connection,
        `SELECT id, creator_id, accepted_media_asset_id FROM creation_projects
         WHERE id = ? AND creator_id = ? FOR UPDATE`,
        [lifecycle.project_id, input.creatorId]
      );
      if (
        projectRows[0]?.accepted_media_asset_id !== lifecycle.candidate_asset_id
      ) {
        failure(
          "precondition",
          "The Creation Project no longer points at the accepted Body Cinema candidate."
        );
      }
      const trailerRows = await queryRows<TrailerProjectRow>(
        connection,
        `SELECT id, user_id, project_type, source_asset_id FROM trailer_projects
         WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
        [handoff.trailerProjectId, input.creatorId]
      );
      const trailer = trailerRows[0];
      if (
        !trailer ||
        trailer.project_type !== "body_cinema_handoff" ||
        trailer.source_asset_id !== lifecycle.candidate_asset_id
      ) {
        failure(
          "precondition",
          "The durable Trailer Maker plan is missing or does not point at the accepted candidate."
        );
      }
      return { lifecycleId: lifecycle.id, ...handoff };
    });
  }

  async openPlayback(input: {
    creatorId: number;
    id: string;
    artifact: "source" | "candidate";
  }): Promise<BodyCinemaPlaybackArtifact> {
    const rows = await queryRows<LifecycleRow>(
      this.pool,
      `SELECT * FROM body_cinema_candidate_lifecycles
       WHERE id = ? LIMIT 1`,
      [input.id]
    );
    const row = rows[0];
    if (!row)
      failure("not_found", "This Body Cinema lifecycle is unavailable.");
    if (Number(row.creator_id) !== input.creatorId) {
      failure(
        "forbidden",
        "This protected Body Cinema lifecycle does not belong to the current creator."
      );
    }
    if (input.artifact === "source") {
      const source = parseStoredSource(row.source_snapshot_json);
      const asset = await this.readAsset(
        this.pool,
        input.creatorId,
        source.assetId,
        false
      );
      const verified = await this.verifyOriginalSource(
        asset,
        input.creatorId,
        true
      );
      try {
        assertMatchingSourceSnapshot(source, verified.snapshot);
        if (!verified.opened)
          failure(
            "precondition",
            "The verified source is unavailable for protected playback."
          );
        return {
          handle: verified.opened.handle,
          fileName: source.fileName,
          mimeType: source.mimeType,
          sizeBytes: verified.opened.sizeBytes,
        };
      } catch (error) {
        await verified.opened?.handle.close().catch(() => undefined);
        throw error;
      }
    }
    requireLegacyCandidateAuthority(row);
    if (!row.candidate_asset_id || !row.candidate_snapshot_json) {
      failure(
        "not_found",
        "No candidate artifact is attached to this lifecycle."
      );
    }
    if (
      ![
        "candidate_attached",
        "review_in_progress",
        "rejected",
        "accepted",
        "handoff_ready",
      ].includes(row.state)
    ) {
      failure(
        "precondition",
        "The candidate artifact is not available for this lifecycle state."
      );
    }
    await this.transaction(async connection => {
      const locked = await this.lockLifecycleRow(
        connection,
        input.creatorId,
        input.id
      );
      await this.reverifyFrozenSource(connection, locked, input.creatorId);
      return undefined;
    });
    const candidate = parseStoredCandidate(row.candidate_snapshot_json);
    const asset = await this.readAsset(
      this.pool,
      input.creatorId,
      candidate.assetId,
      false
    );
    const verified = await this.verifyPrivateCandidate(
      asset,
      input.creatorId,
      true
    );
    try {
      assertMatchingCandidateSnapshot(candidate, verified.snapshot);
      if (!verified.opened)
        failure(
          "precondition",
          "The candidate is unavailable for protected playback."
        );
      return {
        handle: verified.opened.handle,
        fileName: candidate.fileName,
        mimeType: candidate.mimeType,
        sizeBytes: verified.opened.sizeBytes,
      };
    } catch (error) {
      await verified.opened?.handle.close().catch(() => undefined);
      throw error;
    }
  }

  private async transaction<T>(
    work: (connection: PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }

  private async readAsset(
    executor: QueryExecutor,
    creatorId: number,
    assetId: string,
    forUpdate: boolean
  ): Promise<AssetRow> {
    const rows = await queryRows<AssetRow>(
      executor,
      `SELECT id, user_id, source_type, asset_type, file_name, original_name, mime_type,
              file_size, storage_path, public_url, duration, width, height, status, created_by_feature
       FROM media_assets WHERE id = ? AND user_id = ? LIMIT 1${forUpdate ? " FOR UPDATE" : ""}`,
      [assetId, creatorId]
    );
    const asset = rows[0];
    if (!asset)
      failure(
        "not_found",
        "The selected CreatorVault media asset is unavailable."
      );
    assertReadyOwner(asset, creatorId);
    return asset;
  }

  private async lockAsset(
    connection: PoolConnection,
    creatorId: number,
    assetId: string
  ): Promise<AssetRow> {
    return this.readAsset(connection, creatorId, assetId, true);
  }

  private async lockLifecycleRow(
    connection: PoolConnection,
    creatorId: number,
    id: string,
    allowBodyDirected = false
  ): Promise<LifecycleRow> {
    const rows = await queryRows<LifecycleRow>(
      connection,
      `SELECT * FROM body_cinema_candidate_lifecycles
       WHERE id = ? AND creator_id = ? LIMIT 1 FOR UPDATE`,
      [id, creatorId]
    );
    if (!rows[0])
      failure("not_found", "This Body Cinema lifecycle is unavailable.");
    if (!allowBodyDirected) requireLegacyCandidateAuthority(rows[0]);
    return rows[0];
  }

  private async lockLifecycleRecord(
    connection: PoolConnection,
    creatorId: number,
    id: string
  ): Promise<BodyCinemaLifecycleRecord> {
    return parseLifecycle(
      await this.lockLifecycleRow(connection, creatorId, id)
    );
  }

  private async verifyOriginalSource(
    asset: AssetRow,
    creatorId: number,
    keepOpen: boolean
  ): Promise<VerifiedSource> {
    assertReadyOwner(asset, creatorId);
    const sourceType = normalizeText(asset.source_type).toLowerCase();
    const feature = normalizeText(asset.created_by_feature);
    if (sourceType !== "upload" || !sourceFeatureAllowed(feature)) {
      failure(
        "precondition",
        "Only a verified CreatorVault direct, chunked, or restored original upload can qualify as a Body Cinema source."
      );
    }
    const filename = assetFileName(asset);
    const mimeType = assetMime(asset);
    const publicUrl = valueOrNull(asset.public_url);
    const storagePath = valueOrNull(asset.storage_path);
    if (!publicUrl || !storagePath || publicUrl !== storagePath) {
      failure(
        "precondition",
        "The original source has no exact canonical content-vault storage mapping."
      );
    }
    const mapping = sourceUrlToPath(publicUrl, filename);
    const roots = storageRoots();
    const receipt = await readProtectedJson(
      assertInsideRoot(
        roots.sourceReceiptRoot,
        path.join(roots.sourceReceiptRoot, `${mapping.storageId}.json`),
        "The source receipt"
      ),
      "The source receipt"
    );
    const receiptCreatorId = positiveInteger(
      receipt.creatorId,
      "The source receipt creatorId"
    );
    const receiptUrl = receiptText(receipt, "url");
    const receiptName = receiptText(receipt, "filename");
    const receiptHash = receiptText(receipt, "sha256").toLowerCase();
    const receiptId = receiptText(receipt, "id");
    if (
      receiptCreatorId !== creatorId ||
      receiptId !== mapping.storageId ||
      receiptUrl !== publicUrl ||
      receiptName !== filename ||
      !/^[a-f0-9]{64}$/.test(receiptHash) ||
      receipt.verified !== true
    ) {
      failure(
        "precondition",
        "The private source receipt does not match the owned canonical original."
      );
    }
    const classification = valueOrNull(receipt.classification);
    const acceptedClassification =
      classification === "creator_owned" ||
      (!classification && feature === "body_cinema_chunked_upload");
    if (!acceptedClassification) {
      failure(
        "precondition",
        "The source receipt classification is not an allowed creator-owned original."
      );
    }
    const opened = await inspectOpenedArtifact(
      mapping.filePath,
      MAX_SOURCE_BYTES,
      keepOpen
    );
    try {
      const receiptSize = receiptNumber(receipt, "size");
      const storedSize = valueOrNull(asset.file_size);
      if (
        opened.sizeBytes !== receiptSize ||
        (storedSize !== null &&
          positiveInteger(storedSize, "The media asset file size") !==
            opened.sizeBytes) ||
        opened.sha256.toLowerCase() !== receiptHash
      ) {
        failure(
          "precondition",
          "The current original bytes do not match their private storage receipt."
        );
      }
      const media = parseJsonRecord(
        receipt.media,
        "The source receipt media metadata"
      );
      const receiptWidth = positiveInteger(
        media.width,
        "The source receipt video width"
      );
      const receiptHeight = positiveInteger(
        media.height,
        "The source receipt video height"
      );
      const receiptDuration = finiteNumber(
        media.durationSec,
        "The source receipt video duration"
      );
      if (
        opened.probe.width !== receiptWidth ||
        opened.probe.height !== receiptHeight ||
        !sameDuration(opened.probe.durationSeconds, receiptDuration) ||
        (asset.width !== null &&
          positiveInteger(asset.width, "The media asset width") !==
            opened.probe.width) ||
        (asset.height !== null &&
          positiveInteger(asset.height, "The media asset height") !==
            opened.probe.height) ||
        (asset.duration !== null &&
          !sameDuration(
            finiteNumber(asset.duration, "The media asset duration"),
            opened.probe.durationSeconds
          ))
      ) {
        failure(
          "precondition",
          "The source metadata changed from its receipt or media record."
        );
      }
      const snapshot: StoredSourceSnapshot = {
        assetId: String(asset.id),
        fileName: filename,
        sizeBytes: opened.sizeBytes,
        sha256: opened.sha256,
        mimeType,
        width: opened.probe.width,
        height: opened.probe.height,
        durationSeconds: opened.probe.durationSeconds,
        receiptId,
        classification: classification || "creator_owned_chunked_original",
        canonicalStorageUrl: publicUrl,
        sourceType,
        createdByFeature: feature,
      };
      if (keepOpen) return { snapshot, opened };
      await opened.handle.close().catch(() => undefined);
      return { snapshot };
    } catch (error) {
      await opened.handle.close().catch(() => undefined);
      throw error;
    }
  }

  private async verifyPrivateCandidate(
    asset: AssetRow,
    creatorId: number,
    keepOpen: boolean
  ): Promise<VerifiedCandidate> {
    assertReadyOwner(asset, creatorId);
    const feature = normalizeText(asset.created_by_feature);
    const filename = assetFileName(asset);
    const mimeType = assetMime(asset);
    const storagePath = valueOrNull(asset.storage_path);
    if (
      feature !== "body_cinema_candidate" ||
      valueOrNull(asset.public_url) !== null ||
      !storagePath ||
      !storagePath.startsWith(CANDIDATE_PRIVATE_STORAGE_PREFIX)
    ) {
      failure(
        "precondition",
        "Candidate attachment requires a trusted private Body Cinema candidate artifact, never a public upload URL."
      );
    }
    const privatePathId = storagePath.slice(
      CANDIDATE_PRIVATE_STORAGE_PREFIX.length
    );
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(privatePathId)) {
      failure(
        "precondition",
        "The trusted private candidate path identifier is invalid."
      );
    }
    const roots = storageRoots();
    const candidatePath = assertInsideRoot(
      roots.candidateRoot,
      path.join(roots.candidateRoot, privatePathId),
      "The candidate artifact"
    );
    const receipt = await this.readCandidateReceipt(privatePathId);
    const receiptHash = receiptText(receipt, "sha256").toLowerCase();
    const receiptPathId = receiptText(receipt, "privatePathId");
    const receiptCreator = positiveInteger(
      receipt.creatorId,
      "The candidate receipt creatorId"
    );
    const receiptName = receiptText(receipt, "filename");
    if (
      receipt.privatePathId !== privatePathId ||
      receiptPathId !== privatePathId ||
      receiptCreator !== creatorId ||
      receiptName !== filename ||
      receipt.classification !== "body_cinema_candidate" ||
      receipt.verified !== true ||
      !/^[a-f0-9]{64}$/.test(receiptHash)
    ) {
      failure(
        "precondition",
        "The private candidate receipt does not match the trusted candidate artifact."
      );
    }
    const opened = await inspectOpenedArtifact(
      candidatePath,
      MAX_CANDIDATE_BYTES,
      keepOpen
    );
    try {
      const receiptSize = receiptNumber(receipt, "size");
      if (
        opened.sizeBytes !== receiptSize ||
        opened.sha256.toLowerCase() !== receiptHash ||
        opened.probe.codec !== "h264" ||
        !opened.probe.formatName.split(",").includes("mov") ||
        !filename.toLowerCase().endsWith(".mp4") ||
        mimeType !== "video/mp4"
      ) {
        failure(
          "precondition",
          "The private candidate is not the receipt-bound H.264 MP4 artifact."
        );
      }
      const media = parseJsonRecord(
        receipt.media,
        "The candidate receipt media metadata"
      );
      const receiptWidth = positiveInteger(
        media.width,
        "The candidate receipt video width"
      );
      const receiptHeight = positiveInteger(
        media.height,
        "The candidate receipt video height"
      );
      const receiptDuration = finiteNumber(
        media.durationSec,
        "The candidate receipt video duration"
      );
      if (
        opened.probe.width !== receiptWidth ||
        opened.probe.height !== receiptHeight ||
        !sameDuration(opened.probe.durationSeconds, receiptDuration) ||
        (asset.width !== null &&
          positiveInteger(asset.width, "The candidate media asset width") !==
            opened.probe.width) ||
        (asset.height !== null &&
          positiveInteger(asset.height, "The candidate media asset height") !==
            opened.probe.height) ||
        (asset.duration !== null &&
          !sameDuration(
            finiteNumber(asset.duration, "The candidate media asset duration"),
            opened.probe.durationSeconds
          ))
      ) {
        failure(
          "precondition",
          "The private candidate metadata changed from its receipt or media record."
        );
      }
      const snapshot: StoredCandidateSnapshot = {
        assetId: String(asset.id),
        fileName: filename,
        sizeBytes: opened.sizeBytes,
        sha256: opened.sha256,
        mimeType,
        width: opened.probe.width,
        height: opened.probe.height,
        durationSeconds: opened.probe.durationSeconds,
        receiptId: privatePathId,
        classification: "body_cinema_candidate",
        privatePathId,
        storagePath,
        createdByFeature: "body_cinema_candidate",
      };
      if (keepOpen) return { snapshot, opened };
      await opened.handle.close().catch(() => undefined);
      return { snapshot };
    } catch (error) {
      await opened.handle.close().catch(() => undefined);
      throw error;
    }
  }

  private async readCandidateReceipt(
    privatePathId: string
  ): Promise<Record<string, unknown>> {
    const roots = storageRoots();
    return readProtectedJson(
      assertInsideRoot(
        roots.candidateRoot,
        path.join(roots.candidateRoot, `${privatePathId}.receipt.json`),
        "The candidate receipt"
      ),
      "The candidate receipt"
    );
  }

  private async reverifyFrozenSource(
    connection: PoolConnection,
    lifecycle: LifecycleRow,
    creatorId: number
  ): Promise<VerifiedSource> {
    const expected = parseStoredSource(lifecycle.source_snapshot_json);
    const asset = await this.lockAsset(connection, creatorId, expected.assetId);
    const verified = await this.verifyOriginalSource(asset, creatorId, false);
    assertMatchingSourceSnapshot(expected, verified.snapshot);
    if (
      verified.snapshot.sha256.toLowerCase() !==
      normalizeText(lifecycle.source_sha256).toLowerCase()
    ) {
      failure(
        "precondition",
        "The lifecycle source hash no longer matches the verified source bytes."
      );
    }
    return verified;
  }

  private async reverifyAttachedCandidate(
    connection: PoolConnection,
    lifecycle: LifecycleRow,
    creatorId: number
  ): Promise<VerifiedCandidate> {
    if (
      !lifecycle.candidate_asset_id ||
      !lifecycle.candidate_snapshot_json ||
      !lifecycle.candidate_sha256
    ) {
      failure(
        "precondition",
        "This lifecycle has no immutable candidate artifact."
      );
    }
    const expected = parseStoredCandidate(lifecycle.candidate_snapshot_json);
    const asset = await this.lockAsset(connection, creatorId, expected.assetId);
    const verified = await this.verifyPrivateCandidate(asset, creatorId, false);
    assertMatchingCandidateSnapshot(expected, verified.snapshot);
    if (
      verified.snapshot.sha256.toLowerCase() !==
      lifecycle.candidate_sha256.toLowerCase()
    ) {
      failure(
        "precondition",
        "The lifecycle candidate hash no longer matches the verified candidate bytes."
      );
    }
    return verified;
  }

  private assertCandidateMatchesTreatment(
    candidate: StoredCandidateSnapshot,
    treatment: BodyCinemaCrownRevealTreatment
  ): void {
    const output = treatment.proposedOutput;
    if (
      candidate.width !== output.width ||
      candidate.height !== output.height ||
      !sameDuration(candidate.durationSeconds, output.durationSeconds)
    ) {
      failure(
        "precondition",
        "The candidate dimensions or duration do not match the frozen Crown Reveal output plan."
      );
    }
  }

  private async requireAvailableAttachmentGrant(
    lifecycle: LifecycleRow,
    input: {
      candidateAssetId: string;
      expectedSha256: string;
      provenanceReference: string;
    },
    source: StoredSourceSnapshot
  ): Promise<FutureAttachmentGrant> {
    if (!lifecycle.attachment_authorization_json || !lifecycle.treatment_hash) {
      failure(
        "forbidden",
        "Candidate attachment is default-denied until a future exact owner authorization is durably recorded."
      );
    }
    const grant = futureAttachmentGrantSchema.parse(
      parseJsonRecord(
        lifecycle.attachment_authorization_json,
        "The future attachment authorization"
      )
    );
    const trustedGrant = await readTrustedAttachmentGrant(grant.privatePathId);
    if (
      digest(trustedGrant) !== digest(grant) ||
      grant.lifecycleId !== lifecycle.id ||
      grant.singleUseState !== "available" ||
      grant.sourceHash.toLowerCase() !== source.sha256.toLowerCase() ||
      grant.treatmentHash.toLowerCase() !==
        lifecycle.treatment_hash.toLowerCase() ||
      grant.candidateAssetId !== input.candidateAssetId ||
      grant.candidateHash.toLowerCase() !==
        input.expectedSha256.toLowerCase() ||
      grant.provenanceReference !== input.provenanceReference ||
      new Date(grant.expiresAt).getTime() <= Date.now()
    ) {
      failure(
        "forbidden",
        "The durable future attachment authorization is absent, expired, consumed, or does not match this exact source, treatment, and candidate."
      );
    }
    return grant;
  }
}

type DatabasePoolCarrier = {
  $client?: { promise?: () => Pool };
  client?: { promise?: () => Pool };
};

export async function getBodyCinemaLifecyclePool(): Promise<Pool> {
  const database = (await getDb()) as unknown as DatabasePoolCarrier;
  const client = database.$client ?? database.client;
  if (!client?.promise) {
    throw new Error(
      "CreatorVault's MySQL promise pool is unavailable for the Body Cinema lifecycle."
    );
  }
  return client.promise();
}

let productionService: Promise<BodyCinemaCandidateLifecycleService> | null =
  null;

export async function getBodyCinemaCandidateLifecycleService(): Promise<BodyCinemaCandidateLifecycleService> {
  if (!productionService) {
    productionService = getBodyCinemaLifecyclePool().then(
      pool => new BodyCinemaCandidateLifecycleService(pool)
    );
  }
  return productionService;
}
