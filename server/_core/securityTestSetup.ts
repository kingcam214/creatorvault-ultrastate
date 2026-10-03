import http from "node:http";
import https from "node:https";
import { afterAll, vi } from "vitest";

const fixtures: Record<string, string> = {
  DATABASE_URL: "",
  STRIPE_SECRET_KEY: "sk_test_security_fixture_not_an_account",
  OPENAI_API_KEY: "security_fixture_not_an_account",
  OAUTH_SERVER_URL: "https://invalid.example",
  JWT_SECRET: "security_fixture_not_a_real_signing_key",
  VITE_APP_ID: "security_fixture_app",
  NODE_ENV: "production",
  CREATORVAULT_GOVERNED_MEDIA_AUTORUN: "disabled",
  CREATORVAULT_OUTBOUND_PUBLISH_AUTORUN: "disabled",
};
const originalEnvironment = new Map(
  Object.keys(fixtures).map(name => [name, process.env[name]])
);
for (const [name, value] of Object.entries(fixtures)) process.env[name] = value;

const originalFetch = globalThis.fetch;
vi.stubGlobal(
  "fetch",
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (
      url.hostname !== "127.0.0.1" &&
      url.hostname !== "localhost" &&
      url.hostname !== "[::1]"
    )
      throw new Error("Security tests prohibit external HTTP requests");
    return originalFetch(input, init);
  }
);
const networkSpies = [
  vi.spyOn(http, "request").mockImplementation(() => {
    throw new Error("Security tests prohibit outbound HTTP clients");
  }),
  vi.spyOn(https, "request").mockImplementation(() => {
    throw new Error("Security tests prohibit outbound HTTPS clients");
  }),
  vi.spyOn(http, "get").mockImplementation(() => {
    throw new Error("Security tests prohibit outbound HTTP clients");
  }),
  vi.spyOn(https, "get").mockImplementation(() => {
    throw new Error("Security tests prohibit outbound HTTPS clients");
  }),
];
afterAll(() => {
  for (const [name, value] of originalEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  vi.unstubAllGlobals();
  for (const spy of networkSpies) spy.mockRestore();
});
