import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export type ProofClass = "gold_standard" | "public_showcase" | "flagship";
export type ProofStatus = "candidate" | "certified" | "rejected" | "retired";
export type CreativeMethod = "creator_capture" | "professional_editorial" | "premium_hosted" | "controlled_gpu";

export type CreationProofCertification = {
  id: string;
  creatorId: number;
  assetId: string;
  creationProjectId: string | null;
  proofClass: ProofClass;
  status: ProofStatus;
  creativeMethod: CreativeMethod;
  technicalScore: number;
  identityScore: number;
  editorialScore: number;
  sourceTruthScore: number;
  commercialScore: number;
  overallScore: number;
  reviewPacket: Record<string, unknown>;
  reviewedBy: number | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  certifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProofReviewPacket = {
  watchableUrl: string;
  contactSheetUrl: string;
  continuousPlaybackReviewed: boolean;
  sourceLineageVerified: boolean;
  rightsAndConsentVerified: boolean;
  rejectionLedgerChecked: boolean;
  publicClassification: "creator_owned" | "creatorvault_demo" | "approved_campaign";
  evidenceSummary: string;
};

const PROOF_CLASSES: ProofClass[] = ["gold_standard", "public_showcase", "flagship"];
const PROOF_STATUSES: ProofStatus[] = ["candidate", "certified", "rejected", "retired"];
const CREATIVE_METHODS: CreativeMethod[] = ["creator_capture", "professional_editorial", "premium_hosted", "controlled_gpu"];

function rowsOf(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
}

async function rawQuery(query: string, params: unknown[] = []): Promise<any[]> {
  const database = await getDb();
  if (!database) throw new Error("CreatorVault proof data is unavailable.");
  const client = (database as any).$client || (database as any).client;
  if (client && typeof client.promise === "function") {
    const [rows] = await client.promise().query(query, params);
    return rows as any[];
  }
  if (client && typeof client.execute === "function") {
    const [rows] = await client.execute(query, params);
    return rows as any[];
  }
  const result = await (database as any).execute(sql.raw(query));
  return rowsOf(result);
}

async function rawExec(query: string, params: unknown[] = []): Promise<any> {
  const database = await getDb();
  if (!database) throw new Error("CreatorVault proof data is unavailable.");
  const client = (database as any).$client || (database as any).client;
  if (client && typeof client.promise === "function") {
    const [result] = await client.promise().query(query, params);
    return result;
  }
  if (client && typeof client.execute === "function") {
    const [result] = await client.execute(query, params);
    return result;
  }
  return (database as any).execute(sql.raw(query));
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function serialiseJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    throw new Error("CreatorVault could not preserve this proof evidence.");
  }
}

function iso(value: unknown): string | null {
  return value ? new Date(String(value)).toISOString() : null;
}

function score(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${label} must be a score from 0 to 100.`);
  }
  return Math.round(parsed * 100) / 100;
}

function asProof(row: any): CreationProofCertification {
  return {
    id: String(row.id),
    creatorId: Number(row.creator_id),
    assetId: String(row.asset_id),
    creationProjectId: row.creation_project_id ? String(row.creation_project_id) : null,
    proofClass: String(row.proof_class) as ProofClass,
    status: String(row.status) as ProofStatus,
    creativeMethod: String(row.creative_method) as CreativeMethod,
    technicalScore: Number(row.technical_score),
    identityScore: Number(row.identity_score),
    editorialScore: Number(row.editorial_score),
    sourceTruthScore: Number(row.source_truth_score),
    commercialScore: Number(row.commercial_score),
    overallScore: Number(row.overall_score),
    reviewPacket: parseJson(row.review_packet_json),
    reviewedBy: row.reviewed_by == null ? null : Number(row.reviewed_by),
    reviewNotes: row.review_notes ? String(row.review_notes) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    certifiedAt: iso(row.certified_at),
    createdAt: iso(row.created_at) || new Date(0).toISOString(),
    updatedAt: iso(row.updated_at) || new Date(0).toISOString(),
  };
}

export async function ensureCreationProofSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS creation_proof_certifications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    asset_id VARCHAR(191) NOT NULL,
    creation_project_id CHAR(36) NULL,
    proof_class VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'candidate',
    creative_method VARCHAR(48) NOT NULL,
    technical_score DECIMAL(5,2) NOT NULL,
    identity_score DECIMAL(5,2) NOT NULL,
    editorial_score DECIMAL(5,2) NOT NULL,
    source_truth_score DECIMAL(5,2) NOT NULL,
    commercial_score DECIMAL(5,2) NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    review_packet_json LONGTEXT NOT NULL,
    reviewed_by BIGINT NULL,
    review_notes TEXT NULL,
    rejection_reason TEXT NULL,
    certified_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY creation_proof_asset_class (asset_id, proof_class),
    KEY creation_proof_creator_status (creator_id, status, updated_at),
    KEY creation_proof_project (creation_project_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function requireReadyOwnedAsset(creatorId: number, assetId: string): Promise<{ id: string; publicUrl: string }> {
  const rows = await rawQuery(
    `SELECT id, public_url, storage_path
       FROM media_assets
      WHERE id = ? AND user_id = ? AND status = 'ready'
      LIMIT 1`,
    [assetId, creatorId],
  );
  if (!rows.length) throw new Error("Only a ready CreatorVault media item can enter the proof library.");
  const publicUrl = String(rows[0].public_url || rows[0].storage_path || "").trim();
  if (!publicUrl) throw new Error("This media item has no durable playback path.");
  return { id: String(rows[0].id), publicUrl };
}

async function requireOwnedProject(creatorId: number, projectId: string | null): Promise<void> {
  if (!projectId) return;
  const rows = await rawQuery("SELECT id FROM creation_projects WHERE id = ? AND creator_id = ? LIMIT 1", [projectId, creatorId]);
  if (!rows.length) throw new Error("This creation proof must link to a CreatorVault creation owned by the current creator.");
}

function validateReviewPacket(packet: ProofReviewPacket, assetUrl: string): ProofReviewPacket {
  const watchableUrl = String(packet.watchableUrl || "").trim();
  const contactSheetUrl = String(packet.contactSheetUrl || "").trim();
  const evidenceSummary = String(packet.evidenceSummary || "").trim();
  if (!watchableUrl || !/^https:\/\//i.test(watchableUrl)) throw new Error("A Gold Standard proof needs its exact watchable URL.");
  if (watchableUrl !== assetUrl) throw new Error("The proof packet must review the exact Media Vault asset being certified.");
  if (!contactSheetUrl || !/^https:\/\//i.test(contactSheetUrl)) throw new Error("A Gold Standard proof needs a durable contact-sheet URL.");
  if (!['creator_owned', 'creatorvault_demo', 'approved_campaign'].includes(packet.publicClassification)) {
    throw new Error("Choose a truthful public classification for this evidence packet.");
  }
  if (evidenceSummary.length < 32) throw new Error("Record the visible evidence that makes this proof worthy of certification.");
  return { ...packet, watchableUrl, contactSheetUrl, evidenceSummary };
}

function highestProofStatus(input: { scores: number[]; packet: ProofReviewPacket; notes: string; rejectionReason?: string | null }): ProofStatus {
  if (input.rejectionReason) return "rejected";
  const minimum = Math.min(...input.scores);
  const overall = input.scores.reduce((sum, value) => sum + value, 0) / input.scores.length;
  const fullEvidence = input.packet.continuousPlaybackReviewed
    && input.packet.sourceLineageVerified
    && input.packet.rightsAndConsentVerified
    && input.packet.rejectionLedgerChecked;
  if (minimum >= 90 && overall >= 92 && fullEvidence && input.notes.length >= 32) return "certified";
  return "candidate";
}

export async function reviewCreationProof(input: {
  creatorId: number;
  reviewedBy: number;
  assetId: string;
  creationProjectId?: string | null;
  proofClass: ProofClass;
  creativeMethod: CreativeMethod;
  technicalScore: number;
  identityScore: number;
  editorialScore: number;
  sourceTruthScore: number;
  commercialScore: number;
  reviewPacket: ProofReviewPacket;
  reviewNotes: string;
  rejectionReason?: string | null;
}): Promise<CreationProofCertification> {
  await ensureCreationProofSchema();
  if (!PROOF_CLASSES.includes(input.proofClass)) throw new Error("This proof class is not recognised.");
  if (!CREATIVE_METHODS.includes(input.creativeMethod)) throw new Error("Declare a permitted creative method for this proof.");
  await requireOwnedProject(input.creatorId, input.creationProjectId || null);
  const asset = await requireReadyOwnedAsset(input.creatorId, input.assetId);
  const packet = validateReviewPacket(input.reviewPacket, asset.publicUrl);
  const technicalScore = score(input.technicalScore, "Technical quality");
  const identityScore = score(input.identityScore, "Identity and anatomy quality");
  const editorialScore = score(input.editorialScore, "Editorial quality");
  const sourceTruthScore = score(input.sourceTruthScore, "Source truth quality");
  const commercialScore = score(input.commercialScore, "Commercial quality");
  const scores = [technicalScore, identityScore, editorialScore, sourceTruthScore, commercialScore];
  const overallScore = Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) / 100;
  const reviewNotes = String(input.reviewNotes || "").trim();
  const rejectionReason = String(input.rejectionReason || "").trim() || null;
  if (!rejectionReason && reviewNotes.length < 32) throw new Error("Record a real visual review before this proof can be evaluated.");
  const status = highestProofStatus({ scores, packet, notes: reviewNotes, rejectionReason });
  const existing = await rawQuery(
    "SELECT id FROM creation_proof_certifications WHERE asset_id = ? AND proof_class = ? LIMIT 1",
    [asset.id, input.proofClass],
  );
  const id = existing[0]?.id ? String(existing[0].id) : randomUUID();
  await rawExec(
    `INSERT INTO creation_proof_certifications
      (id, creator_id, asset_id, creation_project_id, proof_class, status, creative_method,
       technical_score, identity_score, editorial_score, source_truth_score, commercial_score, overall_score,
       review_packet_json, reviewed_by, review_notes, rejection_reason, certified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'certified' THEN NOW() ELSE NULL END, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       creator_id = VALUES(creator_id), creation_project_id = VALUES(creation_project_id), status = VALUES(status),
       creative_method = VALUES(creative_method), technical_score = VALUES(technical_score), identity_score = VALUES(identity_score),
       editorial_score = VALUES(editorial_score), source_truth_score = VALUES(source_truth_score), commercial_score = VALUES(commercial_score),
       overall_score = VALUES(overall_score), review_packet_json = VALUES(review_packet_json), reviewed_by = VALUES(reviewed_by),
       review_notes = VALUES(review_notes), rejection_reason = VALUES(rejection_reason),
       certified_at = CASE WHEN VALUES(status) = 'certified' THEN NOW() ELSE NULL END, updated_at = NOW()`,
    [
      id, input.creatorId, asset.id, input.creationProjectId || null, input.proofClass, status, input.creativeMethod,
      technicalScore, identityScore, editorialScore, sourceTruthScore, commercialScore, overallScore,
      serialiseJson(packet), input.reviewedBy, reviewNotes || null, rejectionReason, status,
    ],
  );
  const rows = await rawQuery("SELECT * FROM creation_proof_certifications WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) throw new Error("CreatorVault could not preserve this proof review.");
  return asProof(rows[0]);
}

export async function listCreationProofs(creatorId: number, status?: ProofStatus): Promise<CreationProofCertification[]> {
  await ensureCreationProofSchema();
  if (status && !PROOF_STATUSES.includes(status)) throw new Error("This proof state is not recognised.");
  const rows = await rawQuery(
    `SELECT * FROM creation_proof_certifications
      WHERE creator_id = ? ${status ? "AND status = ?" : ""}
      ORDER BY updated_at DESC`,
    status ? [creatorId, status] : [creatorId],
  );
  return rows.map(asProof);
}

export async function hasCertifiedPublicProof(input: { creatorId: number; assetId: string }): Promise<boolean> {
  const eligibility = await getPublicProofEligibility(input);
  return eligibility.eligible;
}

export async function getPublicProofEligibility(input: { creatorId: number; assetId: string }): Promise<{
  assetId: string;
  eligible: boolean;
  certificationId: string | null;
  proofClass: ProofClass | null;
  certifiedAt: string | null;
}> {
  await ensureCreationProofSchema();
  const rows = await rawQuery(
    `SELECT id, proof_class, certified_at
      FROM creation_proof_certifications
      WHERE creator_id = ? AND asset_id = ? AND status = 'certified' AND proof_class IN ('public_showcase', 'flagship')
      ORDER BY certified_at DESC
      LIMIT 1`,
    [input.creatorId, input.assetId],
  );
  const row = rows[0];
  return {
    assetId: input.assetId,
    eligible: Boolean(row),
    certificationId: row?.id ? String(row.id) : null,
    proofClass: row?.proof_class ? String(row.proof_class) as ProofClass : null,
    certifiedAt: iso(row?.certified_at),
  };
}

export async function getPublicProofEligibilityForAssets(input: { creatorId: number; assetIds: string[] }): Promise<Map<string, boolean>> {
  await ensureCreationProofSchema();
  const assetIds = [...new Set(input.assetIds.map((assetId) => String(assetId || "").trim()).filter(Boolean))];
  const eligibility = new Map(assetIds.map((assetId) => [assetId, false]));
  if (!assetIds.length) return eligibility;
  const placeholders = assetIds.map(() => "?").join(", ");
  const rows = await rawQuery(
    `SELECT DISTINCT asset_id
      FROM creation_proof_certifications
      WHERE creator_id = ? AND status = 'certified' AND proof_class IN ('public_showcase', 'flagship')
        AND asset_id IN (${placeholders})`,
    [input.creatorId, ...assetIds],
  );
  for (const row of rows) {
    if (row?.asset_id) eligibility.set(String(row.asset_id), true);
  }
  return eligibility;
}

export const CREATION_PROOF_POLICY = {
  publicProofNeedsOwnerReviewedEvidence: true,
  certifiedProofMinimumScore: 90,
  certifiedProofMinimumOverallScore: 92,
  ffmpegCreativeMethodAllowed: false,
  candidateIsNotPublicProof: true,
  rejectedVisualMayNotBeReplacedWithoutDirection: true,
} as const;
