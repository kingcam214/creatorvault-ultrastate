import "./securityTestSetup";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../../shared/const";
import { registerAuthenticationRoutes } from "./authenticationRoutes";
import { sdk } from "./sdk";
import * as localAuth from "./localAuth";

vi.mock("./sdk", () => ({
  sdk: {
    createSessionToken: vi.fn(),
    exchangeCodeForToken: vi.fn(),
    getUserInfo: vi.fn(),
  },
}));
vi.mock("./localAuth", () => ({
  findLocalAuthUserByEmail: vi.fn(async () => null),
  verifyLocalPassword: vi.fn(async () => false),
  markUserSignedIn: vi.fn(),
  getSessionDurations: vi.fn(),
  getSessionDisplayName: vi.fn(),
}));

const closeServers: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of closeServers.splice(0)) await close();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
async function authServer(): Promise<string> {
  const app = express();
  app.use(express.json());
  registerAuthenticationRoutes(app);
  // Match the production SPA fallback so a forgotten block cannot appear as a 200.
  app.get("*", (_req, res) => res.status(200).send("SPA fallback"));
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  closeServers.push(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      })
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing local test address");
  return `http://127.0.0.1:${address.port}`;
}

describe("retired development login", () => {
  it.each(["production", "development", "test", "Production", "", undefined])(
    "never issues a session with NODE_ENV=%s",
    async nodeEnv => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      const base = await authServer();
      for (const method of [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "HEAD",
        "OPTIONS",
      ]) {
        const response = await fetch(
          `${base}/api/dev-login?redirect=/owner-control&NODE_ENV=development&role=king`,
          {
            method,
            redirect: "manual",
            headers: { "x-node-env": "development", "x-role": "king" },
          }
        );
        expect(response.status).toBe(404);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("cache-control")).toBe("no-store");
        if (method !== "HEAD")
          expect(await response.json()).toEqual({ error: "Not found" });
      }
      expect(sdk.createSessionToken).not.toHaveBeenCalled();
    }
  );
  it("is mounted by the actual entry point with no hard-coded dev session", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(source).toContain("registerAuthenticationRoutes(app)");
    expect(source).not.toContain('app.get("/api/dev-login"');
    expect(source).not.toContain("local_kingcam_6");
    expect(source).not.toContain("sdk.createSessionToken");
    expect(source.indexOf("registerAuthenticationRoutes(app)")).toBeLessThan(
      source.indexOf("serveStatic(app)")
    );
  });
  it("keeps ordinary login validation and logout routes mounted", async () => {
    const base = await authServer();
    const missingFields = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(missingFields.status).toBe(400);
    const invalidAccount = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "nobody@example.test",
        password: "not-a-password",
      }),
    });
    expect(invalidAccount.status).toBe(401);
    expect(sdk.createSessionToken).not.toHaveBeenCalled();
    const logout = await fetch(`${base}/api/auth/logout`, { method: "POST" });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=`);
    expect(await logout.json()).toEqual({ ok: true });
  });
  it("still authenticates valid ordinary email credentials through the registered login handler", async () => {
    const user: localAuth.LocalAuthUser = {
      id: "101",
      email: "ordinary@example.test",
      passwordHash: "fixture-only",
      openId: "ordinary-security-fixture",
      role: "user",
      firstName: "Ordinary",
      lastName: "Fixture",
    };
    vi.mocked(localAuth.findLocalAuthUserByEmail).mockResolvedValueOnce(user);
    vi.mocked(localAuth.verifyLocalPassword).mockResolvedValueOnce(true);
    vi.mocked(localAuth.getSessionDurations).mockReturnValueOnce({ expiresInMs: 60000, cookieMaxAge: 60000 });
    vi.mocked(localAuth.getSessionDisplayName).mockReturnValueOnce("Ordinary Fixture");
    vi.mocked(sdk.createSessionToken).mockResolvedValueOnce("synthetic-session-fixture");
    const base = await authServer();
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "fixture-password", role: "king" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      token: "synthetic-session-fixture",
      user: { id: "101", email: user.email, name: "Ordinary Fixture", role: "user" },
    });
    expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=synthetic-session-fixture`);
    expect(sdk.createSessionToken).toHaveBeenCalledWith(user.openId, { expiresInMs: 60000, name: "Ordinary Fixture" });
    expect(localAuth.markUserSignedIn).toHaveBeenCalledWith("101");
  });
  it("keeps OAuth callback validation mounted before the SPA fallback", async () => {
    const base = await authServer();
    const response = await fetch(`${base}/api/oauth/callback`, { redirect: "manual" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "code and state are required" });
    expect(sdk.exchangeCodeForToken).not.toHaveBeenCalled();
    expect(sdk.createSessionToken).not.toHaveBeenCalled();
  });
});
