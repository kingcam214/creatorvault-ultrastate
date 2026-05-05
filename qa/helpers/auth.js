/**
 * CreatorVault QA — Auth Helper
 * Generates valid JWT tokens and provides authenticated fetch for all test layers.
 * 
 * Token format: HS256 JWT with { openId, appId, name } payload
 * Cookie name: app_session_id
 */
import { createHmac } from "crypto";

const BASE_URL = process.env.CV_BASE_URL || "https://creatorvault.live";
const JWT_SECRET = process.env.CV_JWT_SECRET || "9f84a3f736a830542a66a5541eec42a7e47dcca4e599cf610f98c15efa2d6252";
const OPEN_ID = process.env.CV_OPEN_ID || "local_kingcam_6";
const APP_ID = process.env.CV_APP_ID || "creatorvault";
const USER_NAME = process.env.CV_USER_NAME || "KingCam";
const COOKIE_NAME = "app_session_id";

let _cachedToken = null;
let _tokenExpiry = 0;

/**
 * Generate a fresh HS256 JWT with the correct payload structure.
 */
function generateToken(expiresInSeconds = 86400 * 30) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    openId: OPEN_ID,
    appId: APP_ID,
    name: USER_NAME,
    iat: now,
    exp: now + expiresInSeconds,
  })).toString("base64url");

  const sig = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${sig}`;
}

/**
 * Get a valid session token (cached, auto-refreshed).
 */
export function getToken() {
  const now = Math.floor(Date.now() / 1000);
  if (!_cachedToken || now >= _tokenExpiry - 60) {
    _cachedToken = generateToken();
    _tokenExpiry = now + 86400 * 30;
  }
  return _cachedToken;
}

// For backwards compat
export async function getSessionCookie() {
  return `${COOKIE_NAME}=${getToken()}`;
}

/**
 * Authenticated fetch — adds session cookie to every request.
 */
export async function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: `${COOKIE_NAME}=${token}`,
    },
  });
}

/**
 * tRPC query helper — GET for queries.
 */
export async function trpcQuery(procedure, input = undefined) {
  const qs = input !== undefined
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "";
  const res = await authFetch(`${BASE_URL}/api/trpc/${procedure}${qs}`);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

/**
 * tRPC mutation helper — POST for mutations.
 */
export async function trpcMutate(procedure, input) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/trpc/${procedure}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({ json: input }),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

export { BASE_URL, COOKIE_NAME };
