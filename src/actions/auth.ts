"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions, students } from "@/db/schema";
import { createSession, destroySession, hashPassword, logAudit, requireUser, verifyPassword } from "@/lib/auth";
import { isPlatformAdminUser } from "@/lib/platform-auth";

export async function flashTo(path: string, msg?: string, err = false) {
  if (!msg) redirect(path);
  redirect(`${path}?${err ? "flashErr" : "flash"}=${encodeURIComponent(msg)}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?err=Enter your email and password.");

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?err=Invalid email or password. Please try again.");
  }
  if (user.studentId) {
    const [activeStudent] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, user.studentId), isNull(students.deletedAt)))
      .limit(1);
    if (!activeStudent) {
      redirect("/login?err=Invalid email or password. Please try again.");
    }
  }
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  await logAudit(user.id, "Login", "user", user.id, `${user.name} signed in`);

  const requestedNext = String(formData.get("next") ?? "");
  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : null;

  redirect(
    safeNext ??
      (isPlatformAdminUser({ id: user.id, email: user.email, role: user.role })
        ? "/superadmin"
        : "/dashboard"),
  );
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 6) {
    await flashTo("/profile", "New password must be at least 6 characters.", true);
  }

  if (next !== confirm) {
    await flashTo("/profile", "New passwords do not match.", true);
  }

  if (current === next) {
    await flashTo("/profile", "Your new password must be different from your current password.", true);
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const account = rows[0];

  if (!account || !verifyPassword(current, account.passwordHash)) {
    await flashTo("/profile", "Current password is incorrect.", true);
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(next) })
    .where(eq(users.id, user.id));

  // Preserve this device's session and delete all other sessions.
  const jar = await cookies();
  const currentToken = jar.get("sms_session")?.value;

  if (currentToken) {
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          ne(sessions.token, currentToken)
        )
      );
  }

  await logAudit(user.id, "Password changed", "user", user.id);

  await flashTo(
    "/profile",
    "Password updated successfully. Other devices have been signed out."
  );
}

