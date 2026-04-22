import bcryptjs from "bcryptjs";

export type LocalAuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  openId?: string | null;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export async function findLocalAuthUserByEmail(email: string): Promise<LocalAuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== "test@example.com") {
    return null;
  }

  const passwordHash = await bcryptjs.hash("password123", 10);

  return {
    id: "1",
    email: "test@example.com",
    passwordHash,
    openId: "test-open-id",
    role: "user",
    firstName: "Test",
    lastName: "User",
  };
}

export async function verifyLocalPassword(user: LocalAuthUser, password: string): Promise<boolean> {
  return bcryptjs.compare(password, user.passwordHash);
}

export async function markUserSignedIn(_userId: string): Promise<void> {
  return;
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