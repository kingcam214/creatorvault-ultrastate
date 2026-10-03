import "./securityTestSetup";
import path from "node:path";
import express from "express";
import { createServer } from "node:http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { collectPrivilegedProcedurePaths } from "../../scripts/securityProcedureInventory";
import expectedPrivilegePaths from "../../scripts/security-privileged-procedures.json";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createContext, type TrpcContext } from "./context";
import {
  adminProcedure,
  kingProcedure,
  ownerProcedure,
  protectedProcedure,
  router,
} from "./trpc";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "../../shared/const";
import { appRouter } from "../routers";
import * as db from "../db";

const dbFixtures = vi.hoisted(() => ({
  currentUser: { value: null as TrpcContext["user"] },
}));
vi.mock("../db", async importOriginal => ({
  ...(await importOriginal<typeof import("../db")>()),
  getUserByOpenId: vi.fn(async () => dbFixtures.currentUser.value),
  upsertUser: vi.fn(async () => undefined),
  getAllUsers: vi.fn(async () => []),
  getUsersByRole: vi.fn(async () => []),
  updateUserRole: vi.fn(async () => undefined),
  updateCreatorStatus: vi.fn(async () => undefined),
  updateUserProfile: vi.fn(async () => undefined),
}));

function context(
  role: NonNullable<TrpcContext["user"]>["role"] | null,
  id = 101
): TrpcContext {
  return {
    user:
      role === null
        ? null
        : {
            id,
            openId: "security-fixture",
            name: "Fixture",
            email: "fixture@example.test",
            loginMethod: "email",
            role,
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
            stripeConnectAccountId: null,
            createdAt: new Date(0),
            updatedAt: new Date(0),
            lastSignedIn: new Date(0),
          },
    req: {
      headers: { "x-role": "king" },
      body: { role: "admin" },
      protocol: "https",
    } as unknown as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}
afterEach(() => vi.clearAllMocks());

const probe = router({
  king: kingProcedure
    .input(z.object({ role: z.string().optional() }))
    .query(({ ctx }) => ctx.user.role),
  admin: adminProcedure.query(({ ctx }) => ctx.user.role),
  owner: ownerProcedure.query(({ ctx }) => ctx.user.role),
  ordinary: protectedProcedure.query(({ ctx }) => ctx.user.id),
});

type GateMiddleware = (options: {
  ctx: TrpcContext;
  path: string;
  type: "query" | "mutation" | "subscription";
  input: unknown;
  getRawInput: () => Promise<unknown>;
  meta: unknown;
  signal: AbortSignal | undefined;
  next: () => Promise<{ ok: true; data: unknown; marker: "middlewareMarker" }>;
}) => Promise<{ ok: boolean }>;
type GuardedProcedure = {
  _def: {
    middlewares: GateMiddleware[];
    type: "query" | "mutation" | "subscription";
  };
};
const mountedProcedures = appRouter._def.procedures as unknown as Record<
  string,
  GuardedProcedure
>;
const privilegedPaths = collectPrivilegedProcedurePaths(
  path.resolve(import.meta.dirname, "../..")
);
function invoke(
  ctx: TrpcContext,
  procedurePath: string,
  input?: unknown
): Promise<unknown> {
  const caller = appRouter.createCaller(ctx) as unknown as Record<
    string,
    (value?: unknown) => Promise<unknown>
  >;
  return caller[procedurePath](input);
}

describe("server-side owner role gate", () => {
  it.each(["user", "creator", "influencer", "celebrity"] as const)(
    "denies %s despite spoofed input and headers",
    async role => {
      const caller = probe.createCaller(context(role));
      await expect(caller.king({ role: "king" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.owner()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin()).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(await caller.ordinary()).toBe(101);
    }
  );
  it.each(["admin", "king"] as const)(
    "retains intended %s privileges",
    async role => {
      const caller = probe.createCaller(context(role));
      expect(await caller.king({})).toBe(role);
      expect(await caller.owner()).toBe(role);
      expect(await caller.admin()).toBe(role);
    }
  );
  it("fails closed for unauthenticated requests", async () => {
    await expect(
      probe.createCaller(context(null)).owner()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("all mounted named privileged procedures", () => {
  it("includes sensitive user actions, owner control, and every Chica exported king guard", () => {
    for (const expected of [
      "users.getAll",
      "users.getByRole",
      "users.updateRole",
      "users.updateCreatorStatus",
      "ownerControl.getLogs",
      "chicaFunnel.provision",
      "chicaFunnel.activate",
    ])
      expect(privilegedPaths).toContain(expected);
    expect(privilegedPaths).toEqual(expectedPrivilegePaths);
    for (const procedurePath of privilegedPaths)
      expect(mountedProcedures[procedurePath], procedurePath).toBeDefined();
  });
  it.each(["user", "creator"] as const)(
    "rejects %s before input validation or privileged business handlers",
    async role => {
      for (const procedurePath of privilegedPaths) {
        await expect(
          invoke(context(role), procedurePath),
          procedurePath
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      expect(db.getAllUsers).not.toHaveBeenCalled();
      expect(db.updateUserRole).not.toHaveBeenCalled();
      expect(db.updateCreatorStatus).not.toHaveBeenCalled();
    }
  );
  it.each(["user", "creator"] as const)(
    "does not treat former owner IDs as %s authority",
    async role => {
      for (const id of [6, 33]) {
        for (const procedurePath of privilegedPaths)
          await expect(
            invoke(context(role, id), procedurePath),
            `${id}:${procedurePath}`
          ).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
    }
  );
});

describe("actual account administration", () => {
  it("prevents administrators from minting king-only authority through any role mutation", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(
      caller.auth.updateProfile({ role: "king" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.users.updateRole({ userId: 101, role: "king" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.missionControl.updateUserRole({ userId: 101, role: "king" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateUserRole).not.toHaveBeenCalled();
  });
  it.each(["user", "creator"] as const)(
    "cannot elevate %s using a role-change payload",
    async role => {
      const caller = appRouter.createCaller(context(role));
      await expect(
        caller.users.updateRole({ userId: 101, role: "king" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.auth.updateProfile({ role: "admin", name: "Changed" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(db.updateUserRole).not.toHaveBeenCalled();
      expect(db.updateUserProfile).not.toHaveBeenCalled();
    }
  );
  it.each(["admin", "king"] as const)(
    "lets %s reach intended user handlers",
    async role => {
      const caller = appRouter.createCaller(context(role));
      expect(await caller.users.getAll()).toEqual([]);
      expect(await caller.users.getByRole({ role: "creator" })).toEqual([]);
      expect(
        await caller.users.updateRole({ userId: 101, role: "creator" })
      ).toEqual({ success: true });
      expect(
        await caller.users.updateCreatorStatus({
          userId: 101,
          status: "approved",
        })
      ).toEqual({ success: true });
      expect(db.updateUserRole).toHaveBeenCalledWith(101, "creator");
      expect(db.updateCreatorStatus).toHaveBeenCalledWith(101, "approved");
    }
  );
  it("preserves normal self-service profile edits", async () => {
    expect(
      await appRouter
        .createCaller(context("creator"))
        .auth.updateProfile({ name: "New name" })
    ).toEqual({ success: true });
    expect(db.updateUserProfile).toHaveBeenCalledWith(101, {
      name: "New name",
    });
  });
});

describe("every mounted privileged gate preserves intended role access", () => {
  it.each(["admin", "king"] as const)(
    "allows %s through role middleware without executing business handlers",
    async role => {
      for (const procedurePath of privilegedPaths) {
        const procedure = mountedProcedures[procedurePath];
        expect(
          procedure._def.middlewares.length,
          procedurePath
        ).toBeGreaterThanOrEqual(3);
        // The first two are authentication and role authorization, before input and resolver.
        for (const middleware of procedure._def.middlewares.slice(0, 2)) {
          const result = await middleware({
            ctx: context(role, 6),
            path: procedurePath,
            type: procedure._def.type,
            input: undefined,
            getRawInput: async () => undefined,
            meta: undefined,
            signal: undefined,
            next: async () => ({
              ok: true as const,
              data: role,
              marker: "middlewareMarker" as const,
            }),
          });
          expect(result.ok, `${role}:${procedurePath}`).toBe(true);
        }
      }
      expect(db.getAllUsers).not.toHaveBeenCalled();
      expect(db.updateUserRole).not.toHaveBeenCalled();
    }
  );
  it("also rejects unauthenticated requests from every privileged procedure", async () => {
    for (const procedurePath of privilegedPaths)
      await expect(
        invoke(context(null), procedurePath),
        procedurePath
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("real tRPC transport and database-backed session identity", () => {
  it.each(["user", "creator"] as const)(
    "ignores spoofed client roles and sends safe HTTP 403 for %s",
    async role => {
      const fixture = context(role, 6);
      dbFixtures.currentUser.value = fixture.user;
      const token = await sdk.createSessionToken("security-fixture", {
        name: "Fixture",
        expiresInMs: 60000,
      });
      const app = express();
      app.use(express.json());
      app.use(
        "/api/trpc",
        createExpressMiddleware({ router: appRouter, createContext })
      );
      const server = createServer(app);
      await new Promise<void>(resolve =>
        server.listen(0, "127.0.0.1", resolve)
      );
      try {
        const address = server.address();
        if (!address || typeof address === "string")
          throw new Error("Missing local test address");
        const response = await fetch(
          `http://127.0.0.1:${address.port}/api/trpc/users.updateRole`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              cookie: `${COOKIE_NAME}=${token}`,
              "x-role": "king",
            },
            body: JSON.stringify({
              json: { userId: 6, role: "king", actorRole: "king" },
            }),
          }
        );
        expect(response.status).toBe(403);
        const text = await response.text();
        expect(text).toContain("FORBIDDEN");
        expect(text).not.toContain("fixture@example.test");
        expect(text).not.toContain(token);
        expect(text).not.toContain("stack");
        expect(db.getUserByOpenId).toHaveBeenCalledWith("security-fixture");
        expect(db.updateUserRole).not.toHaveBeenCalled();
        const ctx = await createContext({
          req: {
            ...fixture.req,
            headers: {
              ...fixture.req.headers,
              cookie: `${COOKIE_NAME}=${token}`,
            },
          } as TrpcContext["req"],
          res: fixture.res,
          info: {},
        } as Parameters<typeof createContext>[0]);
        expect(ctx.user?.role).toBe(role);
      } finally {
        dbFixtures.currentUser.value = null;
        await new Promise<void>((resolve, reject) => {
          server.close(error => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        });
      }
    }
  );
  it("does not accept client role headers when session authentication fails", async () => {
    const fixture = context("user");
    const ctx = await createContext({
      req: fixture.req,
      res: fixture.res,
      info: {},
    } as Parameters<typeof createContext>[0]);
    expect(ctx.user).toBeNull();
    await expect(invoke(ctx, "users.getAll")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
