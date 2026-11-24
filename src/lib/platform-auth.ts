import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/**
 * The platform owner is intentionally identified separately from the school
 * admin role. The role stays `admin` so existing school permissions are
 * preserved; platform access is granted by SUPERADMIN_EMAIL and the owner id.
 */
export const PLATFORM_OWNER_USER_ID = 1;

type PlatformIdentity = {
  id: number;
  email: string;
  role: string;
} | null;

function configuredOwnerEmail(): string | null {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isPlatformAdminUser(user: PlatformIdentity): boolean {
  if (!user || user.id !== PLATFORM_OWNER_USER_ID) return false;
  const ownerEmail = configuredOwnerEmail();
  if (!ownerEmail) return false;
  return (
    user.role === "admin" && user.email.trim().toLowerCase() === ownerEmail
  );
}

/** Returns the signed-in platform owner, or null. Never throws. */
export async function getPlatformAdminUser() {
  const user = await getSessionUser();
  return isPlatformAdminUser(user) ? user : null;
}

/** For server components and server actions. Redirects non-owners. */
export async function requirePlatformAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fsuperadmin");
  if (!isPlatformAdminUser(user)) redirect("/dashboard");
  return user;
}

/** For route handlers. Returns 403 instead of a redirect. */
export async function requirePlatformAdminOrThrow() {
  const user = await getSessionUser();
  if (!isPlatformAdminUser(user)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}
