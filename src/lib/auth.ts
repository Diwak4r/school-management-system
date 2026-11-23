import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, auditLogs, students } from "@/db/schema";

const COOKIE = "sms_session";
const SESSION_DAYS = 7;

/* ------------------------------ Password hash ----------------------------- */

export { hashPassword, verifyPassword } from "./password";

/* -------------------------------- Sessions -------------------------------- */

export async function createSession(userId: number): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_INSECURE_COOKIES !== "1",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(COOKIE);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      studentId: users.studentId,
      teacherId: users.teacherId,
      token: sessions.token,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(students, eq(students.id, users.studentId))
    .where(and(eq(sessions.token, token), or(isNull(users.studentId), isNull(students.deletedAt))))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, row.token));
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    studentId: row.studentId,
    teacherId: row.teacherId,
  };
}

/** Must be used in a server component / action. Redirects to / when logged out. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the user or throws (for route handlers). */
export async function requireUserOrThrow() {
  const user = await getSessionUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

/** Redirects unless the user has one of the given roles. */
export async function requireRole(...roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/* --------------------------------- Audit ---------------------------------- */

export async function logAudit(
  userId: number | null,
  action: string,
  entity?: string,
  entityId?: string | number,
  details?: string,
) {
  try {
    await db
      .insert(auditLogs)
      .values({ userId, action, entity: entity ?? null, entityId: entityId ? String(entityId) : null, details: details ?? null });
  } catch {
    /* audit must never break the flow */
  }
}

