import bcryptjs from "bcryptjs";
import mysql from "mysql2/promise";

export type LocalAuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  openId?: string | null;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

// Create a connection pool for auth lookups
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL ?? "";
    // Parse mysql://user:pass@host:port/db
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      pool = mysql.createPool({
        host: match[3],
        port: parseInt(match[4], 10),
        user: match[1],
        password: match[2],
        database: match[5],
        waitForConnections: true,
        connectionLimit: 5,
      });
    } else {
      // Fallback to env vars
      pool = mysql.createPool({
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT ?? "3306", 10),
        user: process.env.DB_USER ?? "creatorvault",
        password: process.env.DB_PASS ?? "",
        database: process.env.DB_NAME ?? "creatorvault",
        waitForConnections: true,
        connectionLimit: 5,
      });
    }
  }
  return pool;
}

export async function findLocalAuthUserByEmail(email: string): Promise<LocalAuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const db = getPool();
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id, email, password, openId, role, name FROM users WHERE email = ? AND is_active = 1 LIMIT 1",
      [normalizedEmail]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const user = rows[0];

    // Must have a password hash to use email/password login
    if (!user.password) {
      return null;
    }

    // Parse name into firstName/lastName
    const nameParts = (user.name ?? "").split(" ");
    const firstName = nameParts[0] ?? null;
    const lastName = nameParts.slice(1).join(" ") || null;

    return {
      id: String(user.id),
      email: user.email as string,
      passwordHash: user.password as string,
      openId: user.openId as string | null,
      role: user.role as string | null,
      firstName,
      lastName,
    };
  } catch (err) {
    console.error("[localAuth] DB lookup error:", err);
    return null;
  }
}

export async function verifyLocalPassword(user: LocalAuthUser, password: string): Promise<boolean> {
  return bcryptjs.compare(password, user.passwordHash);
}

export async function markUserSignedIn(userId: string): Promise<void> {
  try {
    const db = getPool();
    await db.execute(
      "UPDATE users SET lastSignedIn = NOW() WHERE id = ?",
      [userId]
    );
  } catch (err) {
    console.error("[localAuth] markUserSignedIn error:", err);
  }
}

export function getSessionDurations(rememberMe: boolean): {
  expiresInMs: number;
  cookieMaxAge: number;
} {
  const oneDay = 1000 * 60 * 60 * 24;
  const thirtyDays = oneDay * 30;

  return rememberMe
    ? { expiresInMs: thirtyDays, cookieMaxAge: thirtyDays }
    : { expiresInMs: oneDay, cookieMaxAge: oneDay };
}

export function getSessionDisplayName(user: LocalAuthUser): string {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email;
}
