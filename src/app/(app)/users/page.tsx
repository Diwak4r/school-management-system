
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, students, teachers, sessions, parentChildren } from "@/db/schema";
import { requireRole, hashPassword, logAudit } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";
import { flashTo } from "@/actions/auth";
import {
  PageHead,
  Badge,
  FormModal,
  ModalCancel,
  Field,
  Icon,
  Empty,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/* ------------------------- Create student account ------------------------ */

export async function createStudentAccount(formData: FormData) {
  "use server";

  const admin = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const studentId = Number(formData.get("studentId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!Number.isInteger(studentId) || studentId <= 0) {
    await flashTo("/users", "Please select a valid student.", true);
  }

  if (!email.includes("@")) {
    await flashTo("/users", "Enter a valid login email.", true);
  }

  if (password.length < 8) {
    await flashTo("/users", "Initial password must be at least 8 characters.", true);
  }

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);

  if (!student || student.deletedAt) {
    await flashTo("/users", "Student not found or has been deleted.", true);
  }

  const [linked] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.studentId, studentId), eq(users.schoolId, schoolId)))
    .limit(1);

  if (linked) {
    await flashTo("/users", "This student already has a login account.", true);
  }

  const [duplicateEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.schoolId, schoolId)))
    .limit(1);

  if (duplicateEmail) {
    await flashTo("/users", "This email is already used by another account.", true);
  }

  await db.insert(users).values({
    schoolId,
    name: student.name,
    email,
    passwordHash: hashPassword(password),
    role: "student",
    studentId: student.id,
  });

  await logAudit(
    admin.id,
    "Created student login",
    "user",
    student.id,
    `${student.name} — ${email}`,
  );

  await flashTo("/users", `Login account created for ${student.name}.`);
}

/* ------------------------- Create teacher account ------------------------ */

export async function createTeacherAccount(formData: FormData) {
  "use server";

  const admin = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const teacherId = Number(formData.get("teacherId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    await flashTo("/users", "Please select a valid teacher.", true);
  }

  if (!email.includes("@")) {
    await flashTo("/users", "Enter a valid login email.", true);
  }

  if (password.length < 8) {
    await flashTo("/users", "Initial password must be at least 8 characters.", true);
  }

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(and(eq(teachers.id, teacherId), eq(teachers.schoolId, schoolId)))
    .limit(1);

  if (!teacher || teacher.status !== "active") {
    await flashTo("/users", "Teacher not found or inactive.", true);
  }

  const [linked] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.teacherId, teacherId), eq(users.schoolId, schoolId)))
    .limit(1);

  if (linked) {
    await flashTo("/users", "This teacher already has a login account.", true);
  }

  const [duplicateEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.schoolId, schoolId)))
    .limit(1);

  if (duplicateEmail) {
    await flashTo("/users", "This email is already used by another account.", true);
  }

  await db.insert(users).values({
    schoolId,
    name: teacher.name,
    email,
    passwordHash: hashPassword(password),
    role: "teacher",
    teacherId: teacher.id,
  });

  await logAudit(
    admin.id,
    "Created teacher login",
    "user",
    teacher.id,
    `${teacher.name} — ${email}`,
  );

  await flashTo("/users", `Login account created for ${teacher.name}.`);
}

/* ---------------------------- Reset password ----------------------------- */

export async function resetAccountPassword(formData: FormData) {
  "use server";

  const admin = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const userId = Number(formData.get("userId"));
  const password = String(formData.get("password") ?? "");

  if (!Number.isInteger(userId) || userId <= 0) {
    await flashTo("/users", "Invalid account.", true);
  }

  if (password.length < 8) {
    await flashTo("/users", "New password must be at least 8 characters.", true);
  }

  const [account] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.schoolId, schoolId)))
    .limit(1);

  if (!account || !["student", "teacher"].includes(account.role)) {
    await flashTo("/users", "Only student and teacher passwords can be reset here.", true);
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(and(eq(users.id, userId), eq(users.schoolId, schoolId)));

  // Revoke all existing sessions for this account.
  await db.delete(sessions).where(eq(sessions.userId, userId));

  await logAudit(
    admin.id,
    "Reset account password",
    "user",
    userId,
    `${account.name} — ${account.role}`,
  );

  await flashTo("/users", `Password reset successfully for ${account.name}.`);
}

/* ------------------------- Create parent account -------------------------- */

export async function createParentAccount(formData: FormData) {
  "use server";

  const admin = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const studentIds = formData.getAll("studentIds").map(Number).filter((id) => Number.isInteger(id) && id > 0);

  if (!name || !email || password.length < 8 || studentIds.length === 0) {
    await flashTo("/users", "Name, email, a password of at least 8 characters and at least one child are required.", true);
  }

  const [duplicate] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (duplicate) await flashTo("/users", "That email is already registered.", true);

  const children = await db
    .select({ id: students.id })
    .from(students)
    .where(and(inArray(students.id, studentIds), eq(students.schoolId, schoolId)));
  if (children.length !== studentIds.length) {
    await flashTo("/users", "One or more selected children are not in this school.", true);
  }

  const [created] = await db
    .insert(users)
    .values({
      schoolId,
      name,
      email,
      passwordHash: hashPassword(password),
      role: "parent",
      isActive: true,
    })
    .returning({ id: users.id });

  try {
    await db.insert(parentChildren).values(
      studentIds.map((studentId) => ({ schoolId, userId: created.id, studentId })),
    );
  } catch {
    // Compensate: a parent without a valid child link must not remain.
    await db.delete(users).where(eq(users.id, created.id));
    await flashTo("/users", "Could not link the selected children. No account was created.", true);
  }

  await logAudit(admin.id, "Parent account created", "user", created.id, `${name} — ${studentIds.length} child(ren)`);
  await flashTo("/users", `Parent account created for ${name}.`);
}

/* --------------------------------- Page ----------------------------------- */

export default async function UsersPage() {
  await requireRole("admin");
  const schoolId = await currentSchoolId();

  const [accounts, allStudents, allTeachers] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        studentId: users.studentId,
        teacherId: users.teacherId,
        createdAt: users.createdAt,
        studentName: students.name,
        admissionNo: students.admissionNo,
        teacherName: teachers.name,
        employeeNo: teachers.employeeNo,
      })
      .from(users)
      .leftJoin(students, and(eq(users.studentId, students.id), eq(students.schoolId, schoolId)))
      .leftJoin(teachers, and(eq(users.teacherId, teachers.id), eq(teachers.schoolId, schoolId)))
      .where(eq(users.schoolId, schoolId))
      .orderBy(users.role, users.name),

    db
      .select()
      .from(students)
      .where(and(isNull(students.deletedAt), eq(students.schoolId, schoolId)))
      .orderBy(students.name),

    db
      .select()
      .from(teachers)
      .where(and(eq(teachers.status, "active"), eq(teachers.schoolId, schoolId)))
      .orderBy(teachers.name),
  ]);

  const linkedStudentIds = new Set(
    accounts.map((a) => a.studentId).filter((id): id is number => id !== null),
  );

  const linkedTeacherIds = new Set(
    accounts.map((a) => a.teacherId).filter((id): id is number => id !== null),
  );

  const availableStudents = allStudents.filter(
    (s) => !linkedStudentIds.has(s.id),
  );

  const availableTeachers = allTeachers.filter(
    (t) => !linkedTeacherIds.has(t.id),
  );

  return (
    <>
      <PageHead
        title="User Management"
        sub={`${accounts.length} login accounts`}
      >
        <div className="flex flex-wrap gap-2">
          <FormModal
            title="Create student login"
            icon="plus"
            label="Student login"
            wide
          >
            <form action={createStudentAccount} className="grid gap-3.5">
              <Field label="Select student *">
                <select name="studentId" required className="inp">
                  <option value="">Choose student</option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.admissionNo}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Login email *">
                <input
                  name="email"
                  type="email"
                  required
                  className="inp"
                  placeholder="student@example.com"
                />
              </Field>

              <Field label="Initial password *">
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="inp"
                  autoComplete="new-password"
                />
              </Field>

              <p className="text-xs text-muted">
                The student will use this email and password to log in.
              </p>

              <div className="flex justify-end gap-2">
                <ModalCancel />
                <button className="btn-primary" type="submit">
                  <Icon name="check" className="w-4 h-4" />
                  Create account
                </button>
              </div>
            </form>
          </FormModal>

          <FormModal
            title="Create teacher login"
            icon="plus"
            label="Teacher login"
            wide
          >
            <form action={createTeacherAccount} className="grid gap-3.5">
              <Field label="Select teacher *">
                <select name="teacherId" required className="inp">
                  <option value="">Choose teacher</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.employeeNo}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Login email *">
                <input
                  name="email"
                  type="email"
                  required
                  className="inp"
                  placeholder="teacher@example.com"
                />
              </Field>

              <Field label="Initial password *">
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="inp"
                  autoComplete="new-password"
                />
              </Field>

              <div className="flex justify-end gap-2">
                <ModalCancel />
                <button className="btn-primary" type="submit">
                  <Icon name="check" className="w-4 h-4" />
                  Create account
                </button>
              </div>
            </form>
          </FormModal>

          <FormModal
            title="Create parent login"
            icon="plus"
            label="Parent login"
            wide
          >
            <form action={createParentAccount} className="grid gap-3.5">
              <Field label="Parent name *">
                <input name="name" required className="inp" />
              </Field>
              <Field label="Login email *">
                <input name="email" type="email" required className="inp" />
              </Field>
              <Field label="Initial password *">
                <input name="password" type="password" minLength={8} required className="inp" autoComplete="new-password" />
              </Field>
              <Field label="Linked children *">
                <select name="studentIds" multiple required size={Math.min(6, Math.max(3, availableStudents.length))} className="inp">
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.admissionNo}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-muted">Hold Ctrl/Cmd to select more than one child.</p>
              <div className="flex justify-end gap-2">
                <ModalCancel />
                <button className="btn-primary" type="submit">
                  <Icon name="check" className="w-4 h-4" />
                  Create account
                </button>
              </div>
            </form>
          </FormModal>
        </div>
      </PageHead>

      <div className="card overflow-hidden">
        {accounts.length === 0 ? (
          <Empty
            icon="users"
            title="No login accounts found"
            sub="Create a student or teacher login account to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[780px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Login email</th>
                  <th>Role</th>
                  <th>Linked record</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-semibold">{account.name}</td>
                    <td className="text-inksoft">{account.email}</td>
                    <td>
                      <Badge
                        tone={
                          account.role === "admin"
                            ? "purple"
                            : account.role === "teacher"
                              ? "blue"
                              : account.role === "student"
                                ? "green"
                                : "gray"
                        }
                      >
                        {account.role}
                      </Badge>
                    </td>
                    <td className="text-xs text-inksoft">
                      {account.role === "student"
                        ? account.admissionNo ?? "Student record unavailable"
                        : account.role === "teacher"
                          ? account.employeeNo ?? "Teacher record unavailable"
                          : "—"}
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(account.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="text-right">
                      {["student", "teacher"].includes(account.role) && (
                        <FormModal
                          title={`Reset password — ${account.name}`}
                          btnClass="btn-ghost btn-sm"
                          icon="key-round"
                          label="Reset"
                        >
                          <form
                            action={resetAccountPassword}
                            className="grid gap-3.5"
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={account.id}
                            />

                            <Field label="New password *">
                              <input
                                type="password"
                                name="password"
                                minLength={8}
                                required
                                className="inp"
                                autoComplete="new-password"
                              />
                            </Field>

                            <p className="text-xs text-muted">
                              Resetting the password will sign this account
                              out of all existing sessions.
                            </p>

                            <div className="flex justify-end gap-2">
                              <ModalCancel />
                              <button className="btn-primary" type="submit">
                                Reset password
                              </button>
                            </div>
                          </form>
                        </FormModal>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted mt-3">
        Passwords are securely hashed. Existing admin accounts are not
        modified by this page.
      </p>
    </>
  );
}
