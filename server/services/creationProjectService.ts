import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export type CreationProjectState =
  | "building"
  | "waiting_on_source"
  | "ready_to_create"
  | "in_progress"
  | "ready_to_review"
  | "accepted"
  | "prepared_to_share"
  | "blocked"
  | "archived";

export type CreationProject = {
  id: string;
  creatorId: number;
  title: string;
  intent: string;
  outputPurpose: string;
  state: CreationProjectState;
  sourceAssetId: string | null;
  sourceEvidenceId: string | null;
  treatmentId: string | null;
  identityReference: string | null;
  audioAssetId: string | null;
  creationDirectorRequestId: string | null;
  renderJobId: string | null;
  acceptedAssetId: string | null;
  socialPackageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreationProjectEvent = {
  id: string;
  projectId: string;
  actorId: number;
  eventType: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type CreationProjectDashboard = CreationProject & {
  sourceAsset: ProjectAsset | null;
  acceptedAsset: ProjectAsset | null;
  events: CreationProjectEvent[];
};

type ProjectAsset = {
  id: string;
  assetType: string | null;
  sourceType: string | null;
  fileName: string;
  publicUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  status: string | null;
};

type ProjectLinkPatch = {
  sourceAssetId?: string | null;
  sourceEvidenceId?: string | null;
  treatmentId?: string | null;
  identityReference?: string | null;
  audioAssetId?: string | null;
  creationDirectorRequestId?: string | null;
  renderJobId?: string | null;
  acceptedAssetId?: string | null;
  socialPackageId?: string | null;
  state?: CreationProjectState;
  metadata?: Record<string, unknown>;
};

const PROJECT_STATES: CreationProjectState[] = [
  "building",
  "waiting_on_source",
  "ready_to_create",
  "in_progress",
  "ready_to_review",
  "accepted",
  "prepared_to_share",
  "blocked",
  "archived",
];

function rowsOf(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
}

async function rawQuery(query: string, params: unknown[] = []): Promise<any[]> {
  const database = await getDb();
  if (!database) throw new Error("CreatorVault data is unavailable.");
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
  if (!database) throw new Error("CreatorVault data is unavailable.");
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

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serializationError: true });
  }
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

function iso(value: unknown): string {
  return value ? new Date(String(value)).toISOString() : new Date(0).toISOString();
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function normaliseProject(row: any): CreationProject {
  return {
    id: String(row.id),
    creatorId: Number(row.creator_id),
    title: String(row.title),
    intent: String(row.intent),
    outputPurpose: String(row.output_purpose),
    state: String(row.state) as CreationProjectState,
    sourceAssetId: textOrNull(row.source_media_asset_id),
    sourceEvidenceId: textOrNull(row.source_evidence_id),
    treatmentId: textOrNull(row.treatment_id),
    identityReference: textOrNull(row.identity_reference),
    audioAssetId: textOrNull(row.audio_asset_id),
    creationDirectorRequestId: textOrNull(row.creation_director_request_id),
    renderJobId: textOrNull(row.render_job_id),
    acceptedAssetId: textOrNull(row.accepted_media_asset_id),
    socialPackageId: textOrNull(row.social_package_id),
    metadata: parseJson(row.metadata_json),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function normaliseEvent(row: any): CreationProjectEvent {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    actorId: Number(row.actor_id),
    eventType: String(row.event_type),
    detail: parseJson(row.detail_json),
    createdAt: iso(row.created_at),
  };
}

function normaliseAsset(row: any): ProjectAsset {
  if (!row) throw new Error("CreatorVault could not read this media asset.");
  return {
    id: String(row.id),
    assetType: textOrNull(row.asset_type),
    sourceType: textOrNull(row.source_type),
    fileName: String(row.original_name || row.file_name || "Untitled media"),
    publicUrl: textOrNull(row.public_url) || textOrNull(row.storage_path),
    thumbnailUrl: textOrNull(row.thumbnail_url) || textOrNull(row.public_url) || textOrNull(row.storage_path),
    durationSeconds: row.duration == null ? null : Number(row.duration),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    status: textOrNull(row.status),
  };
}

export async function ensureCreationProjectSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS creation_projects (
    id CHAR(36) NOT NULL PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    title VARCHAR(191) NOT NULL,
    intent TEXT NOT NULL,
    output_purpose VARCHAR(191) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'building',
    source_media_asset_id VARCHAR(191) NULL,
    source_evidence_id VARCHAR(96) NULL,
    treatment_id VARCHAR(96) NULL,
    identity_reference VARCHAR(191) NULL,
    audio_asset_id VARCHAR(96) NULL,
    creation_director_request_id CHAR(36) NULL,
    render_job_id VARCHAR(96) NULL,
    accepted_media_asset_id VARCHAR(191) NULL,
    social_package_id CHAR(36) NULL,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    KEY creation_projects_creator_updated (creator_id, updated_at),
    KEY creation_projects_source_asset (source_media_asset_id),
    KEY creation_projects_accepted_asset (accepted_media_asset_id),
    KEY creation_projects_director_request (creation_director_request_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS creation_project_events (
    id CHAR(36) NOT NULL PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    actor_id BIGINT NOT NULL,
    event_type VARCHAR(96) NOT NULL,
    detail_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    KEY creation_project_events_project (project_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function appendEvent(input: { projectId: string; actorId: number; eventType: string; detail?: Record<string, unknown> }): Promise<void> {
  await rawExec(
    `INSERT INTO creation_project_events (id, project_id, actor_id, event_type, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [randomUUID(), input.projectId, input.actorId, input.eventType, safeJson(input.detail || {})],
  );
}

async function requireReadyOwnedAsset(creatorId: number, assetId: string): Promise<ProjectAsset> {
  const rows = await rawQuery(
    `SELECT id, asset_type, source_type, file_name, original_name, public_url, thumbnail_url, storage_path,
            duration, width, height, status
       FROM media_assets
      WHERE id = ? AND user_id = ? AND status = 'ready'
      LIMIT 1`,
    [assetId, creatorId],
  );
  if (!rows.length) throw new Error("Choose a ready CreatorVault media item before building this creation.");
  const asset = normaliseAsset(rows[0]);
  if (!asset.publicUrl) throw new Error("This CreatorVault media item is missing its durable playback path.");
  return asset;
}

async function assertOwnedEvidence(creatorId: number, evidenceId: string): Promise<void> {
  const rows = await rawQuery(
    "SELECT id FROM body_cinema_source_evidence WHERE id = ? AND creator_id = ? LIMIT 1",
    [evidenceId, creatorId],
  );
  if (!rows.length) throw new Error("This source analysis does not belong to the current creator.");
}

async function assertOwnedDirectorRequest(creatorId: number, requestId: string): Promise<void> {
  const rows = await rawQuery(
    "SELECT request_id FROM creation_director_requests WHERE request_id = ? AND creator_id = ? LIMIT 1",
    [requestId, creatorId],
  );
  if (!rows.length) throw new Error("This creation path does not belong to the current creator.");
}

async function assertOwnedSocialPackage(creatorId: number, packageId: string): Promise<void> {
  const rows = await rawQuery(
    "SELECT id FROM social_packages WHERE id = ? AND creator_user_id = ? LIMIT 1",
    [packageId, creatorId],
  );
  if (!rows.length) throw new Error("This share package does not belong to the current creator.");
}

async function validateProjectLinks(creatorId: number, patch: ProjectLinkPatch): Promise<void> {
  if (patch.sourceAssetId) await requireReadyOwnedAsset(creatorId, patch.sourceAssetId);
  if (patch.acceptedAssetId) await requireReadyOwnedAsset(creatorId, patch.acceptedAssetId);
  if (patch.sourceEvidenceId) await assertOwnedEvidence(creatorId, patch.sourceEvidenceId);
  if (patch.creationDirectorRequestId) await assertOwnedDirectorRequest(creatorId, patch.creationDirectorRequestId);
  if (patch.socialPackageId) await assertOwnedSocialPackage(creatorId, patch.socialPackageId);
  if (patch.state && !PROJECT_STATES.includes(patch.state)) throw new Error("This creation state is not recognised.");
}

export async function createCreationProject(input: {
  creatorId: number;
  title: string;
  intent: string;
  outputPurpose: string;
  sourceAssetId?: string | null;
  identityReference?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<CreationProject> {
  await ensureCreationProjectSchema();
  const title = String(input.title || "").trim();
  const intent = String(input.intent || "").trim();
  const outputPurpose = String(input.outputPurpose || "").trim();
  if (!title || !intent || !outputPurpose) throw new Error("Name the creation, its goal, and what it is meant to become.");

  const sourceAssetId = textOrNull(input.sourceAssetId);
  if (sourceAssetId) await requireReadyOwnedAsset(input.creatorId, sourceAssetId);
  const id = randomUUID();
  const state: CreationProjectState = sourceAssetId ? "ready_to_create" : "waiting_on_source";
  await rawExec(
    `INSERT INTO creation_projects
      (id, creator_id, title, intent, output_purpose, state, source_media_asset_id, identity_reference, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, input.creatorId, title, intent, outputPurpose, state, sourceAssetId, textOrNull(input.identityReference), safeJson(input.metadata || {})],
  );
  await appendEvent({
    projectId: id,
    actorId: input.creatorId,
    eventType: "creation_opened",
    detail: { sourceAssetId, identityReference: textOrNull(input.identityReference), state },
  });
  return (await getCreationProject(input.creatorId, id))!;
}

export async function getCreationProject(creatorId: number, projectId: string): Promise<CreationProject | null> {
  await ensureCreationProjectSchema();
  const rows = await rawQuery("SELECT * FROM creation_projects WHERE id = ? AND creator_id = ? LIMIT 1", [projectId, creatorId]);
  return rows[0] ? normaliseProject(rows[0]) : null;
}

export async function listCreationProjects(creatorId: number, limit = 30): Promise<CreationProject[]> {
  await ensureCreationProjectSchema();
  const rows = await rawQuery(
    "SELECT * FROM creation_projects WHERE creator_id = ? ORDER BY updated_at DESC LIMIT ?",
    [creatorId, Math.max(1, Math.min(100, Math.floor(limit)))],
  );
  return rows.map(normaliseProject);
}

export async function updateCreationProjectLinks(input: {
  creatorId: number;
  projectId: string;
  actorId: number;
  patch: ProjectLinkPatch;
}): Promise<CreationProject> {
  const current = await getCreationProject(input.creatorId, input.projectId);
  if (!current) throw new Error("This creation could not be found.");
  await validateProjectLinks(input.creatorId, input.patch);

  const nextMetadata = input.patch.metadata ? { ...current.metadata, ...input.patch.metadata } : current.metadata;
  const next = {
    sourceAssetId: input.patch.sourceAssetId === undefined ? current.sourceAssetId : textOrNull(input.patch.sourceAssetId),
    sourceEvidenceId: input.patch.sourceEvidenceId === undefined ? current.sourceEvidenceId : textOrNull(input.patch.sourceEvidenceId),
    treatmentId: input.patch.treatmentId === undefined ? current.treatmentId : textOrNull(input.patch.treatmentId),
    identityReference: input.patch.identityReference === undefined ? current.identityReference : textOrNull(input.patch.identityReference),
    audioAssetId: input.patch.audioAssetId === undefined ? current.audioAssetId : textOrNull(input.patch.audioAssetId),
    creationDirectorRequestId: input.patch.creationDirectorRequestId === undefined ? current.creationDirectorRequestId : textOrNull(input.patch.creationDirectorRequestId),
    renderJobId: input.patch.renderJobId === undefined ? current.renderJobId : textOrNull(input.patch.renderJobId),
    acceptedAssetId: input.patch.acceptedAssetId === undefined ? current.acceptedAssetId : textOrNull(input.patch.acceptedAssetId),
    socialPackageId: input.patch.socialPackageId === undefined ? current.socialPackageId : textOrNull(input.patch.socialPackageId),
    state: input.patch.state || current.state,
  };

  await rawExec(
    `UPDATE creation_projects
        SET source_media_asset_id = ?, source_evidence_id = ?, treatment_id = ?, identity_reference = ?, audio_asset_id = ?,
            creation_director_request_id = ?, render_job_id = ?, accepted_media_asset_id = ?, social_package_id = ?,
            state = ?, metadata_json = ?, updated_at = NOW()
      WHERE id = ? AND creator_id = ?`,
    [
      next.sourceAssetId,
      next.sourceEvidenceId,
      next.treatmentId,
      next.identityReference,
      next.audioAssetId,
      next.creationDirectorRequestId,
      next.renderJobId,
      next.acceptedAssetId,
      next.socialPackageId,
      next.state,
      safeJson(nextMetadata),
      input.projectId,
      input.creatorId,
    ],
  );
  await appendEvent({
    projectId: input.projectId,
    actorId: input.actorId,
    eventType: "creation_linked",
    detail: { patch: input.patch, state: next.state },
  });
  return (await getCreationProject(input.creatorId, input.projectId))!;
}

async function assetForProject(creatorId: number, assetId: string | null): Promise<ProjectAsset | null> {
  if (!assetId) return null;
  const rows = await rawQuery(
    `SELECT id, asset_type, source_type, file_name, original_name, public_url, thumbnail_url, storage_path,
            duration, width, height, status
       FROM media_assets
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
    [assetId, creatorId],
  );
  return rows[0] ? normaliseAsset(rows[0]) : null;
}

export async function acceptInspectedAssemblyRender(input: {
  creatorId: number;
  actorId: number;
  projectId: string;
  renderJobId: string;
  outputUrl: string;
  qualityScore: number;
  qualityNote: string;
}): Promise<CreationProject> {
  const project = await getCreationProject(input.creatorId, input.projectId);
  if (!project) throw new Error("This creation could not be found.");
  if (!project.renderJobId || project.renderJobId !== input.renderJobId) {
    throw new Error("This finished edit is not linked to this creation.");
  }
  if (!/^https:\/\/creatorvault\.live\/uploads\/renders\//i.test(input.outputUrl)) {
    throw new Error("CreatorVault could not verify the finished edit storage path.");
  }
  if (!Number.isFinite(input.qualityScore) || input.qualityScore < 75 || input.qualityScore > 100) {
    throw new Error("Only an inspected edit that clears the quality standard can enter your Vault.");
  }
  const qualityNote = String(input.qualityNote || "").trim();
  if (qualityNote.length < 12) throw new Error("Record why this edit earned approval before adding it to your Vault.");

  const existing = await rawQuery(
    "SELECT id FROM media_assets WHERE user_id = ? AND public_url = ? LIMIT 1",
    [input.creatorId, input.outputUrl],
  );
  const assetId = existing[0]?.id ? String(existing[0].id) : randomUUID();
  if (!existing.length) {
    const baseName = `${project.title || "creatorvault-master"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "creatorvault-master";
    await rawExec(
      `INSERT INTO media_assets
        (id, user_id, source_type, asset_type, file_name, original_name, mime_type, storage_path, public_url, thumbnail_url, status, created_by_feature)
       VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, 'ready', 'body_cinema_assembly')`,
      [assetId, input.creatorId, `${baseName}.mp4`, `${baseName}.mp4`, input.outputUrl, input.outputUrl, input.outputUrl],
    );
  }

  return updateCreationProjectLinks({
    creatorId: input.creatorId,
    projectId: input.projectId,
    actorId: input.actorId,
    patch: {
      acceptedAssetId: assetId,
      state: "accepted",
      metadata: {
        acceptedRenderUrl: input.outputUrl,
        acceptedRenderJobId: input.renderJobId,
        qualityScore: input.qualityScore,
        qualityNote,
        acceptanceBasis: "inspected_source_preserving_assembly",
      },
    },
  });
}

export async function getCreationProjectDashboard(creatorId: number, projectId: string): Promise<CreationProjectDashboard | null> {
  const project = await getCreationProject(creatorId, projectId);
  if (!project) return null;
  const [sourceAsset, acceptedAsset, rows] = await Promise.all([
    assetForProject(creatorId, project.sourceAssetId),
    assetForProject(creatorId, project.acceptedAssetId),
    rawQuery(
      "SELECT * FROM creation_project_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 100",
      [projectId],
    ),
  ]);
  return { ...project, sourceAsset, acceptedAsset, events: rows.map(normaliseEvent) };
}

export const CREATION_PROJECT_POLICY = {
  projectIsAReferenceGraphNotABackendReplacement: true,
  mediaVaultRemainsAssetAuthority: true,
  creationDirectorRemainsGenerationAuthority: true,
  bodyCinemaEvidenceRemainsSourceAnalysisAuthority: true,
  realRenderEngineRemainsAssemblyAuthority: true,
  socialSpineRemainsDistributionAuthority: true,
  acceptedAssetIsRequiredBeforeSharePreparation: true,
} as const;
