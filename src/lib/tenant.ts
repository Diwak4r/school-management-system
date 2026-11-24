import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireUser } from "./auth";

/** School id for the signed-in user. Falls back to the original school only for legacy sessions. */
export async function currentSchoolId(): Promise<number> {
  const user = await requireUser();
  return user.schoolId ?? 1;
}

/** Loads the signed-in user's tenant for pages that need school details. */
export async function requireTenant() {
  const user = await requireUser();
  const schoolId = user.schoolId ?? 1;
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!school) return null;
  return { user, schoolId, school };
}

/** Parses a platform-level school selector from search params. */
export function parseSchoolId(value: unknown, fallback = 1): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
