import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { subjects, classSubjects, examSubjects } from "@/db/schema";
import { requireRole, logAudit } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";
import { flashTo } from "@/actions/auth";
import { PageHead, Field } from "@/components/ui";

export const dynamic = "force-dynamic";

/* ------------------------------ Add Subject ------------------------------ */

export async function addSubject(formData: FormData) {
  "use server";

  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!name || !code) {
    await flashTo("/subjects", "Subject name and code are required.", true);
  }

  if (code.length > 10) {
    await flashTo("/subjects", "Subject code cannot exceed 10 characters.", true);
  }

  const duplicateName = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.name, name), eq(subjects.schoolId, schoolId)))
    .limit(1);

  if (duplicateName.length > 0) {
    await flashTo("/subjects", "This subject name already exists.", true);
  }

  const duplicateCode = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.code, code), eq(subjects.schoolId, schoolId)))
    .limit(1);

  if (duplicateCode.length > 0) {
    await flashTo("/subjects", "This subject code is already in use.", true);
  }

  const [created] = await db
    .insert(subjects)
    .values({ name, code, schoolId })
    .returning({ id: subjects.id });

  await logAudit(user.id, "Added subject", "subject", created.id, name);

  await flashTo("/subjects", `${name} added successfully.`);
}

/* ----------------------------- Update Subject ---------------------------- */

export async function updateSubject(formData: FormData) {
  "use server";

  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!Number.isInteger(id) || id <= 0 || !name || !code) {
    await flashTo("/subjects", "Please provide valid subject details.", true);
  }

  if (code.length > 10) {
    await flashTo("/subjects", "Subject code cannot exceed 10 characters.", true);
  }

  const duplicateName = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(
      and(
        eq(subjects.name, name),
        sql`${subjects.id} != ${id}`,
        eq(subjects.schoolId, schoolId)
      )
    )
    .limit(1);

  if (duplicateName.length > 0) {
    await flashTo("/subjects", "Another subject already uses this name.", true);
  }

  const duplicateCode = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(
      and(
        eq(subjects.code, code),
        sql`${subjects.id} != ${id}`,
        eq(subjects.schoolId, schoolId)
      )
    )
    .limit(1);

  if (duplicateCode.length > 0) {
    await flashTo("/subjects", "Another subject already uses this code.", true);
  }

  await db
    .update(subjects)
    .set({ name, code })
    .where(and(eq(subjects.id, id), eq(subjects.schoolId, schoolId)));

  await logAudit(user.id, "Updated subject", "subject", id, name);

  await flashTo("/subjects", `${name} updated successfully.`);
}

/* ----------------------------- Delete Subject ---------------------------- */

export async function deleteSubject(formData: FormData) {
  "use server";

  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    await flashTo("/subjects", "Invalid subject.", true);
  }

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.schoolId, schoolId)))
    .limit(1);

  if (!subject) {
    await flashTo("/subjects", "Subject not found.", true);
  }

  const [assignment] = await db
    .select({ id: classSubjects.id })
    .from(classSubjects)
    .where(and(eq(classSubjects.subjectId, id), eq(classSubjects.schoolId, schoolId)))
    .limit(1);

  if (assignment) {
    await flashTo(
      "/subjects",
      "This subject is assigned to a class. Remove its class assignment first.",
      true
    );
  }

  const [examSubject] = await db
    .select({ id: examSubjects.id })
    .from(examSubjects)
    .where(and(eq(examSubjects.subjectId, id), eq(examSubjects.schoolId, schoolId)))
    .limit(1);

  if (examSubject) {
    await flashTo(
      "/subjects",
      "This subject is used in an examination. It cannot be deleted.",
      true
    );
  }

  await db.delete(subjects).where(and(eq(subjects.id, id), eq(subjects.schoolId, schoolId)));

  await logAudit(user.id, "Deleted subject", "subject", id, subject.name);

  await flashTo("/subjects", `${subject.name} deleted successfully.`);
}

/* ---------------------------------- Page --------------------------------- */

export default async function SubjectsPage() {
  await requireRole("admin");
  const schoolId = await currentSchoolId();

  const subjectList = await db
    .select()
    .from(subjects)
    .where(eq(subjects.schoolId, schoolId))
    .orderBy(subjects.name);

  return (
    <div>
      <PageHead
        title="Subjects"
        sub="Manage the school's subject list and subject codes."
      />

      {/* Add Subject */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-ink mb-4">Add New Subject</h2>

        <form action={addSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Subject Name">
            <input
              name="name"
              className="inp"
              placeholder="e.g. Mathematics"
              required
              maxLength={100}
            />
          </Field>

          <Field label="Subject Code">
            <input
              name="code"
              className="inp"
              placeholder="e.g. MATH"
              required
              maxLength={10}
            />
          </Field>

          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              + Add Subject
            </button>
          </div>
        </form>
      </div>

      {/* Subject List */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-ink">Subject List</h2>
          <span className="text-sm text-muted">
            Total: {subjectList.length}
          </span>
        </div>

        {subjectList.length === 0 ? (
          <div className="text-center py-10 text-muted">
            <p className="font-medium">No subjects added yet.</p>
            <p className="text-sm mt-1">
              Add your first subject using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line text-muted">
                  <th className="py-3 pr-3">#</th>
                  <th className="py-3 pr-3">Subject Name</th>
                  <th className="py-3 pr-3">Subject Code</th>
                  <th className="py-3 pr-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {subjectList.map((subject, index) => (
                  <tr key={subject.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3">{index + 1}</td>

                    <td className="py-3 pr-3 font-medium text-ink">
                      {subject.name}
                    </td>

                    <td className="py-3 pr-3">
                      <span className="badge">
                        {subject.code}
                      </span>
                    </td>

                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={updateSubject} className="flex flex-wrap gap-2">
                          <input
                            type="hidden"
                            name="id"
                            value={subject.id}
                          />
                          <input
                            name="name"
                            defaultValue={subject.name}
                            className="inp w-36"
                            required
                            maxLength={100}
                            aria-label={`Name of ${subject.name}`}
                          />
                          <input
                            name="code"
                            defaultValue={subject.code}
                            className="inp w-24"
                            required
                            maxLength={10}
                            aria-label={`Code of ${subject.name}`}
                          />
                          <button type="submit" className="btn-ghost">
                            Save
                          </button>
                        </form>

                        <form action={deleteSubject}>
                          <input
                            type="hidden"
                            name="id"
                            value={subject.id}
                          />
                          <button
                            type="submit"
                            className="btn-danger"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}