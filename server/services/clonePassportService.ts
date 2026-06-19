import { getDb } from "../db";

export type ClonePassportStatus = "draft" | "active" | "archived";
export type CloneMemoryType =
  | "fact"
  | "preference"
  | "event"
  | "instruction"
  | "interaction"
  | "asset"
  | "attribution"
  | "system";

export type ClonePassport = {
  id: number;
  userId: number;
  cloneKey: string;
  displayName: string;
  identityProfile: Record<string, unknown>;
  voiceProfile: Record<string, unknown> | null;
  visualProfile: Record<string, unknown> | null;
  behavioralProfile: Record<string, unknown> | null;
  operatingRules: Record<string, unknown> | null;
  sourceRefs: Record<string, unknown> | null;
  status: ClonePassportStatus;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

export type CloneMemoryEntry = {
  id: number;
  passportId: number;
  userId: number;
  memoryType: CloneMemoryType;
  source: string | null;
  sourceId: string | null;
  importance: number;
  confidence: number;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  lastAccessedAt: Date | string | null;
  accessCount: number;
  archivedAt: Date | string | null;
  relevanceScore?: number;
};

type JsonRecord = Record<string, unknown>;

export type UpsertClonePassportInput = {
  userId: number;
  cloneKey?: string;
  displayName?: string;
  identityProfile?: JsonRecord;
  voiceProfile?: JsonRecord | null;
  visualProfile?: JsonRecord | null;
  behavioralProfile?: JsonRecord | null;
  operatingRules?: JsonRecord | null;
  sourceRefs?: JsonRecord | null;
  status?: ClonePassportStatus;
};

export type AddCloneMemoryInput = {
  userId: number;
  passportId?: number;
  cloneKey?: string;
  memoryType?: CloneMemoryType;
  source?: string | null;
  sourceId?: string | null;
  importance?: number;
  confidence?: number;
  content: string;
  metadata?: JsonRecord | null;
};

export type GetCloneMemoriesInput = {
  userId: number;
  passportId?: number;
  cloneKey?: string;
  memoryType?: CloneMemoryType;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
};

export type SearchCloneMemoryInput = GetCloneMemoriesInput & {
  query: string;
};

function normalizeCloneKey(cloneKey?: string): string {
  const normalized = (cloneKey || "default").trim().toLowerCase();
  if (!normalized) return "default";
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(normalized)) {
    throw new Error("Clone key must start with a letter or number and contain only letters, numbers, underscores, or hyphens");
  }
  return normalized;
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  const numeric = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function clampConfidence(value: number | undefined): number {
  const numeric = Number.isFinite(value) ? Number(value) : 1;
  return Math.max(0, Math.min(1, numeric));
}

function stringifyJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function parseJsonRecord(value: unknown): JsonRecord | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return value as JsonRecord;
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value) as JsonRecord;
  } catch {
    return { raw: value };
  }
}

function mapPassport(row: any): ClonePassport {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    cloneKey: String(row.clone_key),
    displayName: String(row.display_name),
    identityProfile: parseJsonRecord(row.identity_profile) || {},
    voiceProfile: parseJsonRecord(row.voice_profile),
    visualProfile: parseJsonRecord(row.visual_profile),
    behavioralProfile: parseJsonRecord(row.behavioral_profile),
    operatingRules: parseJsonRecord(row.operating_rules),
    sourceRefs: parseJsonRecord(row.source_refs),
    status: row.status as ClonePassportStatus,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapMemory(row: any): CloneMemoryEntry {
  return {
    id: Number(row.id),
    passportId: Number(row.passport_id),
    userId: Number(row.user_id),
    memoryType: row.memory_type as CloneMemoryType,
    source: row.source || null,
    sourceId: row.source_id || null,
    importance: Number(row.importance || 0),
    confidence: Number(row.confidence || 0),
    content: String(row.content || ""),
    metadata: parseJsonRecord(row.metadata),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    lastAccessedAt: row.last_accessed_at || null,
    accessCount: Number(row.access_count || 0),
    archivedAt: row.archived_at || null,
    relevanceScore: row.relevance_score === undefined ? undefined : Number(row.relevance_score),
  };
}

async function resolvePassport(userId: number, passportId?: number, cloneKey?: string): Promise<ClonePassport> {
  if (passportId) {
    const passport = await getPassportById(userId, passportId);
    if (!passport) throw new Error(`Clone Passport ${passportId} not found for user ${userId}`);
    return passport;
  }

  const passport = await getPassport(userId, cloneKey);
  if (!passport) throw new Error(`Clone Passport '${normalizeCloneKey(cloneKey)}' not found for user ${userId}`);
  return passport;
}

export async function getPassport(userId: number, cloneKey = "default"): Promise<ClonePassport | null> {
  const db = await getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT * FROM clone_passports WHERE user_id=? AND clone_key=? LIMIT 1`,
    [userId, normalizeCloneKey(cloneKey)]
  );
  const row = (rows as any[])[0];
  return row ? mapPassport(row) : null;
}

export async function getPassportById(userId: number, passportId: number): Promise<ClonePassport | null> {
  const db = await getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT * FROM clone_passports WHERE id=? AND user_id=? LIMIT 1`,
    [passportId, userId]
  );
  const row = (rows as any[])[0];
  return row ? mapPassport(row) : null;
}

export async function upsertPassport(input: UpsertClonePassportInput): Promise<ClonePassport> {
  const db = await getDb();
  const cloneKey = normalizeCloneKey(input.cloneKey);
  const displayName = (input.displayName || cloneKey).trim();
  const identityProfile = stringifyJson(input.identityProfile ?? {});
  const voiceProfile = stringifyJson(input.voiceProfile);
  const visualProfile = stringifyJson(input.visualProfile);
  const behavioralProfile = stringifyJson(input.behavioralProfile);
  const operatingRules = stringifyJson(input.operatingRules);
  const sourceRefs = stringifyJson(input.sourceRefs);
  const status = input.status || "active";

  await db.execute(
    `INSERT INTO clone_passports
     (user_id, clone_key, display_name, identity_profile, voice_profile, visual_profile, behavioral_profile, operating_rules, source_refs, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       display_name = IF(? = 1, VALUES(display_name), display_name),
       identity_profile = IF(? = 1, VALUES(identity_profile), identity_profile),
       voice_profile = IF(? = 1, VALUES(voice_profile), voice_profile),
       visual_profile = IF(? = 1, VALUES(visual_profile), visual_profile),
       behavioral_profile = IF(? = 1, VALUES(behavioral_profile), behavioral_profile),
       operating_rules = IF(? = 1, VALUES(operating_rules), operating_rules),
       source_refs = IF(? = 1, VALUES(source_refs), source_refs),
       status = VALUES(status),
       updated_at = NOW()`,
    [
      input.userId,
      cloneKey,
      displayName,
      identityProfile,
      voiceProfile,
      visualProfile,
      behavioralProfile,
      operatingRules,
      sourceRefs,
      status,
      input.displayName === undefined ? 0 : 1,
      input.identityProfile === undefined ? 0 : 1,
      input.voiceProfile === undefined ? 0 : 1,
      input.visualProfile === undefined ? 0 : 1,
      input.behavioralProfile === undefined ? 0 : 1,
      input.operatingRules === undefined ? 0 : 1,
      input.sourceRefs === undefined ? 0 : 1,
    ]
  );

  const passport = await getPassport(input.userId, cloneKey);
  if (!passport) throw new Error("Clone Passport upsert did not return a persisted row");
  return passport;
}

export async function addMemory(input: AddCloneMemoryInput): Promise<CloneMemoryEntry> {
  const content = input.content.trim();
  if (!content) throw new Error("Clone memory content is required");

  const db = await getDb();
  const passport = await resolvePassport(input.userId, input.passportId, input.cloneKey);
  const importance = clampInt(input.importance, 50, 0, 100);
  const confidence = clampConfidence(input.confidence);

  const [result] = await db.execute<any>(
    `INSERT INTO clone_memory_entries
     (passport_id, user_id, memory_type, source, source_id, importance, confidence, content, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      passport.id,
      input.userId,
      input.memoryType || "fact",
      input.source || null,
      input.sourceId || null,
      importance,
      confidence,
      content,
      stringifyJson(input.metadata),
    ]
  );

  const memory = await getMemoryById(input.userId, Number((result as any).insertId));
  if (!memory) throw new Error("Clone memory insert did not return a persisted row");
  return memory;
}

export async function getMemoryById(userId: number, memoryId: number): Promise<CloneMemoryEntry | null> {
  const db = await getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT * FROM clone_memory_entries WHERE id=? AND user_id=? LIMIT 1`,
    [memoryId, userId]
  );
  const row = (rows as any[])[0];
  return row ? mapMemory(row) : null;
}

export async function getMemories(input: GetCloneMemoriesInput): Promise<CloneMemoryEntry[]> {
  const db = await getDb();
  const passport = await resolvePassport(input.userId, input.passportId, input.cloneKey);
  const limit = clampInt(input.limit, 50, 1, 200);
  const offset = clampInt(input.offset, 0, 0, 10000);
  const params: any[] = [passport.id, input.userId];
  let where = `WHERE passport_id=? AND user_id=?`;

  if (input.memoryType) {
    where += ` AND memory_type=?`;
    params.push(input.memoryType);
  }
  if (!input.includeArchived) {
    where += ` AND archived_at IS NULL`;
  }

  const [rows] = await db.execute<any[]>(
    `SELECT *,
       ((importance / 100) * confidence * 0.60) +
       (1 / (1 + TIMESTAMPDIFF(DAY, created_at, NOW())) * 0.40) AS relevance_score
     FROM clone_memory_entries
     ${where}
     ORDER BY relevance_score DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const memories = (rows as any[]).map(mapMemory);
  if (memories.length > 0) {
    await touchMemories(input.userId, memories.map(memory => memory.id));
  }
  return memories;
}

export async function searchMemory(input: SearchCloneMemoryInput): Promise<CloneMemoryEntry[]> {
  const query = input.query.trim();
  if (!query) return [];

  const db = await getDb();
  const passport = await resolvePassport(input.userId, input.passportId, input.cloneKey);
  const limit = clampInt(input.limit, 25, 1, 100);
  const offset = clampInt(input.offset, 0, 0, 10000);
  const ownershipParams: any[] = [passport.id, input.userId];
  let where = `WHERE passport_id=? AND user_id=?`;

  if (input.memoryType) {
    where += ` AND memory_type=?`;
    ownershipParams.push(input.memoryType);
  }
  if (!input.includeArchived) {
    where += ` AND archived_at IS NULL`;
  }

  const likeQuery = `%${query}%`;
  const params = [query, likeQuery, ...ownershipParams, query, likeQuery, limit, offset];

  const [rows] = await db.execute<any[]>(
    `SELECT *,
       ((importance / 100) * confidence * 0.45) +
       (CASE WHEN MATCH(content) AGAINST (? IN NATURAL LANGUAGE MODE) THEN 0.40 ELSE 0 END) +
       (CASE WHEN content LIKE ? THEN 0.15 ELSE 0 END) +
       (1 / (1 + TIMESTAMPDIFF(DAY, created_at, NOW())) * 0.10) AS relevance_score
     FROM clone_memory_entries
     ${where}
       AND (MATCH(content) AGAINST (? IN NATURAL LANGUAGE MODE) OR content LIKE ?)
     ORDER BY relevance_score DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );

  const memories = (rows as any[]).map(mapMemory);
  if (memories.length > 0) {
    await touchMemories(input.userId, memories.map(memory => memory.id));
  }
  return memories;
}

export async function archiveMemory(userId: number, memoryId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clone_memory_entries SET archived_at=NOW(), updated_at=NOW() WHERE id=? AND user_id=?`,
    [memoryId, userId]
  );
}

async function touchMemories(userId: number, memoryIds: number[]): Promise<void> {
  if (memoryIds.length === 0) return;
  const db = await getDb();
  const placeholders = memoryIds.map(() => "?").join(",");
  await db.execute(
    `UPDATE clone_memory_entries
     SET last_accessed_at=NOW(), access_count=access_count+1
     WHERE user_id=? AND id IN (${placeholders})`,
    [userId, ...memoryIds]
  );
}
