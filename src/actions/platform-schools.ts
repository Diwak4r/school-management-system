"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { schools, sessions, users } from "@/db/schema";
import { flashTo } from "@/actions/auth";
import { logAudit } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/platform-auth";

const text = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim() || null;

async function uniqueCode(code: string, exceptId?: number) {
  const rows = await db
    .select({ id: schools.id })
    .from(schools)
    .where(exceptId ? and(eq(schools.code, code), ne(schools.id, exceptId)) : eq(schools.code, code))
    .limit(1);
  return rows.length === 0;
}

export async function createSchool(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const name = text(formData.get("name"));
  const code = text(formData.get("code"))?.toUpperCase();
  if (!name || !code) {
    await flashTo("/superadmin/schools", "School name and code are required.", true);
  }
  if (!(await uniqueCode(code!))) {
    await flashTo("/superadmin/schools", "That school code is already in use.", true);
  }

  const [created] = await db
    .insert(schools)
    .values({
      name: name!,
      nameNp: text(formData.get("nameNp")),
      code: code!,
      registrationNo: text(formData.get("registrationNo")),
      address: text(formData.get("address")),
      province: text(formData.get("province")),
      district: text(formData.get("district")),
      municipality: text(formData.get("municipality")),
      wardNo: text(formData.get("wardNo")),
      contactEmail: text(formData.get("contactEmail")),
      phone: text(formData.get("phone")),
      principalName: text(formData.get("principalName")),
      logoUrl: text(formData.get("logoUrl")),
      status: "inactive",
      approvalStatus: "pending",
    })
    .returning({ id: schools.id });

  await logAudit(admin.id, "School created", "school", created.id, name!);
  await flashTo("/superadmin/schools", "School registered. Approve it to make it active.");
}

export async function updateSchool(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = Number(formData.get("id"));
  const name = text(formData.get("name"));
  const code = text(formData.get("code"))?.toUpperCase();
  if (!id || !name || !code) {
    await flashTo("/superadmin/schools", "School name and code are required.", true);
  }
  if (!(await uniqueCode(code!, id))) {
    await flashTo("/superadmin/schools", "That school code is already in use.", true);
  }

  await db
    .update(schools)
    .set({
      name: name!,
      nameNp: text(formData.get("nameNp")),
      code: code!,
      registrationNo: text(formData.get("registrationNo")),
      address: text(formData.get("address")),
      province: text(formData.get("province")),
      district: text(formData.get("district")),
      municipality: text(formData.get("municipality")),
      wardNo: text(formData.get("wardNo")),
      contactEmail: text(formData.get("contactEmail")),
      phone: text(formData.get("phone")),
      principalName: text(formData.get("principalName")),
      logoUrl: text(formData.get("logoUrl")),
      updatedAt: new Date(),
    })
    .where(eq(schools.id, id));

  await logAudit(admin.id, "School updated", "school", id, name!);
  await flashTo("/superadmin/schools", "School details saved.");
}

export async function setSchoolStatus(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "inactive", "suspended"].includes(status)) {
    await flashTo("/superadmin/schools", "Invalid school status.", true);
  }
  await db
    .update(schools)
    .set({ status, updatedAt: new Date() })
    .where(eq(schools.id, id));
  await logAudit(admin.id, `School ${status}`, "school", id);
  await flashTo("/superadmin/schools", `School marked ${status}.`);
}

export async function setSchoolApproval(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = Number(formData.get("id"));
  const approval = String(formData.get("approval") ?? "");
  if (!id || !["pending", "approved", "rejected"].includes(approval)) {
    await flashTo("/superadmin/schools", "Invalid approval decision.", true);
  }
  await db
    .update(schools)
    .set({
      approvalStatus: approval,
      status: approval === "approved" ? "active" : "inactive",
      updatedAt: new Date(),
    })
    .where(eq(schools.id, id));
  await logAudit(admin.id, `School approval ${approval}`, "school", id);
  await flashTo("/superadmin/schools", `School ${approval}.`);
}

export async function assignSchoolAdmin(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const schoolId = Number(formData.get("schoolId"));
  const userId = Number(formData.get("userId"));
  if (!schoolId || !userId) {
    await flashTo("/superadmin/schools", "Select a school and a user.", true);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    await flashTo("/superadmin/schools", "User not found.", true);
  }
  if (user.id === admin.id) {
    await flashTo("/superadmin/schools", "The platform owner account cannot be reassigned.", true);
  }

  await db
    .update(users)
    .set({ schoolId, role: "admin" })
    .where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await logAudit(admin.id, "School administrator assigned", "user", userId, `school ${schoolId}`);
  await flashTo("/superadmin/schools", "Administrator assigned. They must sign in again.");
}
