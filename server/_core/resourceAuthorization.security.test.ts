import "./securityTestSetup";
import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./context";
import type { User } from "../../drizzle/schema";
import { vaultxRouter } from "../routers/vaultxRouter";
import { videoUploadRouter } from "../routers/videoUploadRouter";

const state = vi.hoisted(() => ({
  user: null as User | null,
  creatorProfileId: null as number | null,
  purchased: false,
}));
vi.mock("./sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(async () => {
      if (!state.user) throw new Error("No session");
      return state.user;
    }),
  },
}));
vi.mock("../db", async importOriginal => ({
  ...(await importOriginal<typeof import("../db")>()),
  db: {
    $client: {
      promise: () => ({
        query: async (query: string) => {
          let rows: Array<Record<string, unknown>> = [];
          if (query.includes("FROM vaultx_creators"))
            rows =
              state.creatorProfileId === null
                ? []
                : [{ id: state.creatorProfileId }];
          else if (query.includes("FROM content WHERE"))
            rows = [
              {
                id: 11,
                title: "Protected original",
                is_locked: 1,
                unlock_type: "ppv",
                file_url: "https://invalid.example/private-original.mp4",
              },
            ];
          else if (query.includes("FROM vaultx_content"))
            rows = [
              {
                id: 12,
                title: "Protected drop",
                is_ppv: 1,
                ppv_price: 9,
                uncensored_url: "https://invalid.example/private-drop.mp4",
                censored_url: "https://invalid.example/preview.jpg",
              },
            ];
          else if (
            query.includes("FROM vaultx_ppv_purchases") ||
            query.includes("FROM content_unlocks")
          )
            rows = state.purchased ? [{ id: 1 }] : [];
          return [rows, []];
        },
      }),
    },
  },
}));
function fixtureUser(role: User["role"], id: number): User {
  return {
    id,
    role,
    openId: "resource-security-fixture",
    name: "Fixture",
    email: "fixture@example.test",
    loginMethod: "email",
    language: "en",
    country: null,
    referredBy: null,
    creatorStatus: "pending",
    contentType: null,
    primaryBrand: "CREATORVAULT",
    cashappHandle: null,
    paypalEmail: null,
    zelleHandle: null,
    applepayHandle: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastSignedIn: new Date(0),
  };
}
function context(user: User): TrpcContext {
  return {
    user,
    req: { headers: {}, protocol: "https" } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}
afterEach(() => {
  state.user = null;
  state.creatorProfileId = null;
  state.purchased = false;
});

describe("owner exceptions do not follow numeric identity", () => {
  it.each(["user", "creator"] as const)(
    "keeps other creators' paid content locked for %s IDs 6 and 33",
    async role => {
      for (const id of [6, 33]) {
        const result = await vaultxRouter
          .createCaller(context(fixtureUser(role, id)))
          .getCreatorContent({ creatorId: 999 });
        expect(result.items).toHaveLength(2);
        for (const entry of result.items) {
          expect(entry.file_url).toBeNull();
          expect(entry.locked).toBe(true);
        }
      }
    }
  );
  it.each(["admin", "king"] as const)(
    "preserves intended %s access to protected creator content",
    async role => {
      const result = await vaultxRouter
        .createCaller(context(fixtureUser(role, 101)))
        .getCreatorContent({ creatorId: 999 });
      for (const entry of result.items) {
        expect(entry.file_url).toMatch(/private/);
        expect(entry.locked).toBe(false);
      }
    }
  );
  it("preserves a creator's own content and a customer's actual purchased unlock", async () => {
    state.creatorProfileId = 999;
    let result = await vaultxRouter
      .createCaller(context(fixtureUser("creator", 101)))
      .getCreatorContent({ creatorId: 999 });
    for (const entry of result.items) expect(entry.locked).toBe(false);
    state.creatorProfileId = null;
    state.purchased = true;
    result = await vaultxRouter
      .createCaller(context(fixtureUser("user", 101)))
      .getCreatorContent({ creatorId: 999 });
    for (const entry of result.items) expect(entry.locked).toBe(false);
  });
});

describe("actual upload authentication middleware", () => {
  async function requestInit(
    user: User | null,
    creatorProfileId: number | null
  ): Promise<number> {
    state.user = user;
    state.creatorProfileId = creatorProfileId;
    const app = express();
    app.use(express.json());
    app.use("/api/video/upload", videoUploadRouter);
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Missing local address");
      // Empty input proves only middleware permission, with no filesystem/media writes.
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/video/upload/init`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-role": "king" },
          body: "{}",
        }
      );
      await response.text();
      return response.status;
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  }
  it("denies missing sessions", async () => {
    expect(await requestInit(null, null)).toBe(401);
  });
  it.each(["user", "creator"] as const)(
    "requires a creator profile for %s even for IDs 6 and 33",
    async role => {
      for (const id of [6, 33])
        expect(await requestInit(fixtureUser(role, id), null)).toBe(403);
    }
  );
  it("preserves active creator profiles and real owner/admin permissions", async () => {
    expect(await requestInit(fixtureUser("creator", 101), 999)).toBe(400);
    for (const role of ["admin", "king"] as const)
      expect(await requestInit(fixtureUser(role, 101), null)).toBe(400);
  });
});
