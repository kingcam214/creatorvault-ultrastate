import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({ execute })),
}));

import {
  addMemory,
  getMemories,
  searchMemory,
  upsertPassport,
} from "./clonePassportService";

const passportRow = {
  id: 7,
  user_id: 42,
  clone_key: "kingcam",
  display_name: "KingCam Clone",
  identity_profile: JSON.stringify({ creator: "KingCam", vertical: "creator economy" }),
  voice_profile: JSON.stringify({ tone: "direct" }),
  visual_profile: null,
  behavioral_profile: JSON.stringify({ cadence: "fast" }),
  operating_rules: JSON.stringify({ noFakeClaims: true }),
  source_refs: JSON.stringify({ uploads: [100, 101] }),
  status: "active",
  created_at: "2026-06-19T00:00:00.000Z",
  updated_at: "2026-06-19T00:00:00.000Z",
};

const memoryRow = {
  id: 91,
  passport_id: 7,
  user_id: 42,
  memory_type: "instruction",
  source: "clone-onboarding",
  source_id: "session-1",
  importance: 92,
  confidence: "0.9600",
  content: "Never claim results without proof.",
  metadata: JSON.stringify({ acceptance: "evidence-only" }),
  created_at: "2026-06-19T00:00:00.000Z",
  updated_at: "2026-06-19T00:00:00.000Z",
  last_accessed_at: null,
  access_count: 0,
  archived_at: null,
  relevance_score: "0.9412",
};

describe("clonePassportService", () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it("upserts a Clone Passport and returns the persisted row", async () => {
    execute
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[passportRow], undefined]);

    const passport = await upsertPassport({
      userId: 42,
      cloneKey: "KingCam",
      displayName: "KingCam Clone",
      identityProfile: { creator: "KingCam", vertical: "creator economy" },
      voiceProfile: { tone: "direct" },
      behavioralProfile: { cadence: "fast" },
      operatingRules: { noFakeClaims: true },
      sourceRefs: { uploads: [100, 101] },
    });

    expect(passport).toMatchObject({
      id: 7,
      userId: 42,
      cloneKey: "kingcam",
      displayName: "KingCam Clone",
      identityProfile: { creator: "KingCam", vertical: "creator economy" },
      voiceProfile: { tone: "direct" },
      operatingRules: { noFakeClaims: true },
    });
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO clone_passports"),
      expect.arrayContaining([42, "kingcam", "KingCam Clone"])
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SELECT * FROM clone_passports"),
      [42, "kingcam"]
    );
  });

  it("adds Clone Memory only after resolving the caller-owned passport", async () => {
    execute
      .mockResolvedValueOnce([[passportRow], undefined])
      .mockResolvedValueOnce([{ insertId: 91 }, undefined])
      .mockResolvedValueOnce([[memoryRow], undefined]);

    const memory = await addMemory({
      userId: 42,
      cloneKey: "kingcam",
      memoryType: "instruction",
      source: "clone-onboarding",
      sourceId: "session-1",
      importance: 92,
      confidence: 0.96,
      content: "Never claim results without proof.",
      metadata: { acceptance: "evidence-only" },
    });

    expect(memory).toMatchObject({
      id: 91,
      passportId: 7,
      userId: 42,
      memoryType: "instruction",
      importance: 92,
      confidence: 0.96,
      content: "Never claim results without proof.",
      metadata: { acceptance: "evidence-only" },
    });
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SELECT * FROM clone_passports"),
      [42, "kingcam"]
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO clone_memory_entries"),
      [7, 42, "instruction", "clone-onboarding", "session-1", 92, 0.96, "Never claim results without proof.", JSON.stringify({ acceptance: "evidence-only" })]
    );
  });

  it("retrieves memories by recency/relevance and touches returned rows", async () => {
    execute
      .mockResolvedValueOnce([[passportRow], undefined])
      .mockResolvedValueOnce([[memoryRow], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    const memories = await getMemories({
      userId: 42,
      cloneKey: "kingcam",
      memoryType: "instruction",
      limit: 10,
    });

    expect(memories).toHaveLength(1);
    expect(memories[0].relevanceScore).toBeCloseTo(0.9412, 4);
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("ORDER BY relevance_score DESC"),
      [7, 42, "instruction", 10, 0]
    );
    expect(execute).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET last_accessed_at=NOW(), access_count=access_count+1"),
      [42, 91]
    );
  });

  it("searches memory with full-text fallback and scoped caller ownership", async () => {
    execute
      .mockResolvedValueOnce([[passportRow], undefined])
      .mockResolvedValueOnce([[memoryRow], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    const memories = await searchMemory({
      userId: 42,
      cloneKey: "kingcam",
      query: "proof",
      limit: 5,
    });

    expect(memories[0].content).toContain("proof");
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("MATCH(content) AGAINST"),
      ["proof", "%proof%", 7, 42, "proof", "%proof%", 5, 0]
    );
  });
});
