import { SignJWT, jwtVerify } from "jose";
import mysql, {
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  PUBLIC_ORIGIN,
  record,
  requireRelease,
  ReleaseFailure,
} from "./securityReleasePolicy";

export const OWNER_READ = "/api/trpc/waitlistEngine.getWaitlistStats";
const SESSION_COOKIE = "app_session_id";
export type LoginProof = {
  email: string;
  password: string;
  openId: string;
  role: "user" | "creator";
  id: number;
  oldSession: string;
  ownerOpenId: string;
  appId: string;
};
export type HttpResult = {
  status: number;
  location: string | null;
  cookie: string | null;
  body: unknown;
};
const FIXTURE_NAME = "CreatorVault temporary security verifier";
function fixtureIdentity(sha: string): { email: string; username: string } {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_RELEASE_SHA");
  return {
    email: `cvsv_${sha}@verify.invalid`,
    username: `cvsv_${sha.slice(0, 24)}`,
  };
}
/** Real, nonprivileged DB fixture; not a mock auth path or existing-user change. */
export async function provisionLoginVerifier(
  env: Record<string, string>,
  sha: string,
  persistOwnership: (openId: string) => Promise<void>
): Promise<Record<string, string>> {
  requireRelease(
    env.DATABASE_URL && env.VITE_APP_ID && env.JWT_SECRET,
    "EXISTING_APP_AUTH_CONFIGURATION_MISSING"
  );
  const identity = fixtureIdentity(sha);
  let connection: mysql.Connection | undefined;
  let password = "";
  try {
    connection = await mysql.createConnection(env.DATABASE_URL);
    const [owners] = await connection.execute<RowDataPacket[]>(
      "SELECT openId, role FROM users WHERE is_active = 1 AND role IN ('king', 'admin') ORDER BY CASE role WHEN 'king' THEN 0 ELSE 1 END, id ASC LIMIT 1"
    );
    requireRelease(
      owners.length === 1 &&
        typeof owners[0].openId === "string" &&
        owners[0].openId.length > 0 &&
        (owners[0].role === "king" || owners[0].role === "admin"),
      "EXISTING_OWNER_ROLE_UNVERIFIED"
    );
    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
      [identity.email, identity.username]
    );
    requireRelease(existing.length === 0, "VERIFICATION_FIXTURE_COLLISION");
    const [columns] = await connection.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('password', 'password_hash')"
    );
    requireRelease(
      columns.some(row => row.COLUMN_NAME === "password"),
      "STANDARD_LOGIN_PASSWORD_COLUMN_MISSING"
    );
    const both = columns.some(row => row.COLUMN_NAME === "password_hash");
    await connection.execute<ResultSetHeader>({
      sql: "DELETE FROM users WHERE 1 = 0",
      timeout: 15000,
    });
    const openId = `cv_release_verify_${randomUUID()}`;
    await persistOwnership(openId); // Durable public identity before any INSERT; never persist the password/token.
    const random = randomBytes(48);
    try {
      password = random.toString("base64url");
    } finally {
      random.fill(0);
    }
    const hash = await bcrypt.hash(password, 12);
    const query = both
      ? "INSERT INTO users (openId, name, email, username, password, password_hash, role, loginMethod, is_active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'user', 'email', 1, NOW(), NOW())"
      : "INSERT INTO users (openId, name, email, username, password, role, loginMethod, is_active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'user', 'email', 1, NOW(), NOW())";
    const values = [
      openId,
      FIXTURE_NAME,
      identity.email,
      identity.username,
      hash,
    ];
    if (both) values.push(hash);
    const [inserted] = await connection.execute<ResultSetHeader>(
      { sql: query, timeout: 15000 },
      values
    );
    requireRelease(
      inserted.affectedRows === 1,
      "VERIFICATION_FIXTURE_CREATION_FAILED"
    );
    return {
      ...env,
      OWNER_OPEN_ID: owners[0].openId,
      CREATORVAULT_RELEASE_VERIFY_EMAIL: identity.email,
      CREATORVAULT_RELEASE_VERIFY_PASSWORD: password,
    };
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("VERIFICATION_FIXTURE_CREATION_FAILED");
  } finally {
    password = "";
    if (connection) await connection.end().catch(() => undefined);
  }
}
export async function cleanupLoginVerifier(
  databaseUrl: string,
  sha: string,
  openId: string
): Promise<void> {
  const identity = fixtureIdentity(sha);
  requireRelease(
    /^cv_release_verify_[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      openId
    ),
    "INVALID_FIXTURE_OWNERSHIP"
  );
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(databaseUrl);
    await connection.execute<ResultSetHeader>(
      {
        sql: "DELETE FROM users WHERE openId = ? AND email = ? AND username = ? AND name = ? AND role = 'user'",
        timeout: 15000,
      },
      [openId, identity.email, identity.username, FIXTURE_NAME]
    );
    const [remaining] = await connection.execute<RowDataPacket[]>(
      { sql: "SELECT id FROM users WHERE openId = ? LIMIT 1", timeout: 15000 },
      [openId]
    );
    requireRelease(
      remaining.length === 0,
      "OWNED_VERIFICATION_FIXTURE_CLEANUP_FAILED"
    );
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("OWNED_VERIFICATION_FIXTURE_CLEANUP_FAILED");
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }
}
/** Response bodies and cookies stay in memory and are never attached to errors/logs. */
export async function requestPublic(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<HttpResult> {
  requireRelease(
    path.startsWith("/") && !path.startsWith("//"),
    "UNSAFE_VERIFICATION_PATH"
  );
  const headers: Record<string, string> = { "Cache-Control": "no-cache" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Cookie = `${SESSION_COOKIE}=${options.token}`;
  try {
    const response = await fetch(`${PUBLIC_ORIGIN}${path}`, {
      method: options.method ?? "GET",
      headers,
      redirect: "manual",
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(15000),
    });
    requireRelease(!response.headers.get("location"), "VERIFICATION_REDIRECT");
    const reader = response.body?.getReader();
    let text = "";
    let size = 0;
    if (reader) {
      const decoder = new TextDecoder();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 1024 * 1024) {
          await reader.cancel();
          throw new ReleaseFailure("VERIFICATION_RESPONSE_TOO_LARGE");
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    }
    let body: unknown = null;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      /* Non-JSON is never printed. */
    }
    return {
      status: response.status,
      location: response.headers.get("location"),
      cookie: response.headers.get("set-cookie"),
      body,
    };
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("PUBLIC_VERIFICATION_REQUEST_FAILED");
  }
}
export function trpcData(value: unknown): unknown {
  const result = record(record(value).result);
  const data = result.data;
  if (typeof data === "object" && data !== null && "json" in data)
    return record(data).json;
  return data;
}
function tokenFromLogin(response: HttpResult): string {
  requireRelease(response.status === 200, "STANDARD_LOGIN_FAILED");
  const body = record(response.body);
  requireRelease(
    typeof body.token === "string" &&
      body.token.length > 0 &&
      response.cookie?.includes(`${SESSION_COOKIE}=`),
    "STANDARD_LOGIN_SESSION_MISSING"
  );
  return body.token;
}
export async function prepareLoginProof(
  env: Record<string, string>
): Promise<LoginProof> {
  const email = env.CREATORVAULT_RELEASE_VERIFY_EMAIL;
  const password = env.CREATORVAULT_RELEASE_VERIFY_PASSWORD;
  requireRelease(
    email && password && env.DATABASE_URL && env.VITE_APP_ID,
    "EXISTING_LOGIN_VERIFICATION_INPUTS_MISSING"
  );
  // Do not provision users, change passwords, guess credentials, or downgrade to an auth-validation-only probe.
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(env.DATABASE_URL);
    const [users] = await connection.execute<RowDataPacket[]>(
      "SELECT id, openId, role FROM users WHERE email = ? AND is_active = 1 LIMIT 2",
      [email.trim().toLowerCase()]
    );
    requireRelease(users.length === 1, "VERIFICATION_ACCOUNT_NOT_UNIQUE");
    const user = users[0];
    requireRelease(
      (user.role === "user" || user.role === "creator") &&
        typeof user.openId === "string" &&
        Number.isSafeInteger(Number(user.id)),
      "VERIFICATION_ACCOUNT_NOT_ORDINARY"
    );
    const ownerId = env.OWNER_OPEN_ID;
    requireRelease(ownerId, "EXISTING_OWNER_ID_MISSING");
    const [owners] = await connection.execute<RowDataPacket[]>(
      "SELECT openId, role FROM users WHERE openId = ? AND is_active = 1 LIMIT 2",
      [ownerId]
    );
    requireRelease(
      owners.length === 1 &&
        (owners[0].role === "king" || owners[0].role === "admin"),
      "EXISTING_OWNER_ROLE_UNVERIFIED"
    );
    const response = await requestPublic("/api/auth/login", {
      method: "POST",
      body: { email, password, rememberMe: false },
    });
    const oldSession = tokenFromLogin(response);
    const account = record(record(response.body).user);
    requireRelease(
      Number(account.id) === Number(user.id) && account.role === user.role,
      "PRE_RELEASE_LOGIN_IDENTITY_MISMATCH"
    );
    const oldClaims = await jwtVerify(
      oldSession,
      Buffer.from(env.JWT_SECRET ?? ""),
      { algorithms: ["HS256"] }
    ).catch(() => {
      throw new ReleaseFailure("PRE_RELEASE_SESSION_SIGNING_SOURCE_MISMATCH");
    });
    requireRelease(
      oldClaims.payload.openId === user.openId,
      "PRE_RELEASE_SESSION_IDENTITY_MISMATCH"
    );
    const me = await requestPublic("/api/trpc/auth.me", { token: oldSession });
    requireRelease(
      me.status === 200 &&
        Number(record(trpcData(me.body)).id) === Number(user.id),
      "PRE_RELEASE_SESSION_UNVERIFIED"
    );
    const ownerSession = await new SignJWT({
      openId: ownerId,
      appId: env.VITE_APP_ID,
      name: "Security release verification",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(Buffer.from(env.JWT_SECRET ?? ""));
    const ownerRead = await requestPublic(OWNER_READ, { token: ownerSession });
    requireRelease(
      ownerRead.status === 200 &&
        typeof record(trpcData(ownerRead.body)).total === "number",
      "PRE_RELEASE_OWNER_READ_FAILED"
    );
    return {
      email,
      password,
      id: Number(user.id),
      openId: user.openId,
      role: user.role,
      oldSession,
      ownerOpenId: ownerId,
      appId: env.VITE_APP_ID,
    };
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("READ_ONLY_ACCOUNT_PROOF_FAILED");
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }
}
export async function verifyLiveRelease(
  sha: string,
  proof: LoginProof,
  newKey: string
): Promise<void> {
  const release = await requestPublic("/__release");
  const metadata = record(release.body);
  requireRelease(
    release.status === 200 &&
      metadata.commit === sha &&
      metadata.branch === "main" &&
      metadata.environment === "production",
    "PUBLIC_RELEASE_MISMATCH"
  );
  for (const method of ["GET", "POST", "PUT"]) {
    const response = await requestPublic("/api/dev-login", { method });
    requireRelease(
      response.status === 404 && !response.location && !response.cookie,
      "DEVELOPMENT_LOGIN_NOT_RETIRED"
    );
  }
  const old = await requestPublic(OWNER_READ, { token: proof.oldSession });
  requireRelease(old.status === 401, "OLD_SESSION_NOT_INVALIDATED");
  const login = await requestPublic("/api/auth/login", {
    method: "POST",
    body: { email: proof.email, password: proof.password, rememberMe: false },
  });
  const freshSession = tokenFromLogin(login);
  const verified = await jwtVerify(freshSession, Buffer.from(newKey), {
    algorithms: ["HS256"],
  }).catch(() => {
    throw new ReleaseFailure("FRESH_LOGIN_NOT_SIGNED_BY_ROTATED_KEY");
  });
  requireRelease(
    verified.payload.openId === proof.openId,
    "FRESH_LOGIN_IDENTITY_MISMATCH"
  );
  const me = await requestPublic("/api/trpc/auth.me", { token: freshSession });
  const meData = record(trpcData(me.body));
  requireRelease(
    me.status === 200 &&
      Number(meData.id) === proof.id &&
      meData.role === proof.role,
    "ORDINARY_SESSION_FAILED"
  );
  const denied = await requestPublic(OWNER_READ, { token: freshSession });
  requireRelease(denied.status === 403, "ORDINARY_OWNER_READ_NOT_DENIED");
  // Narrow root-side one-shot probe: existing DB owner only, SDK-compatible claims, 60-second lifetime.
  const ownerSession = await new SignJWT({
    openId: proof.ownerOpenId,
    appId: proof.appId,
    name: "Security release verification",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
    .sign(Buffer.from(newKey));
  const owner = await requestPublic(OWNER_READ, { token: ownerSession });
  requireRelease(
    owner.status === 200 &&
      typeof record(trpcData(owner.body)).total === "number",
    "EXISTING_OWNER_ACCESS_FAILED"
  );
}
