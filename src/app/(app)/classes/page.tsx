import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { classes, sections, subjects, teachers, classSubjects, enrollments } from "@/db/schema";
import { requireUser, requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { PageHead, Badge, Icon, ConfirmButton, Field, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

/* ---------------------------------- Actions --------------------------------- */

export async function addSection(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") ?? "").trim().toUpperCase();
  if (!name) await flashTo("/classes", "Section name is required.", true);
  const [c] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  const exists = await db.select().from(sections).where(and(eq(sections.classId, classId), eq(sections.name, name))).limit(1);
  if (exists.length > 0) await flashTo("/classes", `Section ${name} already exists in ${c?.name}.`, true);
  await db.insert(sections).values({ classId, name });
  await logAudit(user.id, "Added section", "section", undefined, `${c?.name} – ${name}`);
  await flashTo("/classes", `Section ${name} added to ${c?.name}.`);
}

export async function deleteSection(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const [sec] = await db.select().from(sections).where(eq(sections.id, id)).limit(1);
  if (!sec) return;
  const count = await db.select({ c: sql<number>`count(*)::int` }).from(enrollments).where(and(eq(enrollments.sectionId, id), eq(enrollments.status, "active")));
  if (count[0].c > 0) await flashTo("/classes", "This section still has enrolled students. Move them first.", true);
  await db.delete(sections).where(eq(sections.id, id));
  await logAudit(user.id, "Removed section", "section", id, sec.name);
  await flashTo("/classes", "Section removed.");
}

export async function saveAssignment(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const classId = Number(formData.get("classId"));
  const subjectId = Number(formData.get("subjectId"));
  const teacherId = formData.get("teacherId") ? Number(formData.get("teacherId")) : null;
  const isClassTeacher = formData.get("isClassTeacher") === "on";
  if (!classId || !subjectId) await flashTo("/classes", "Select a class and subject.", true);

  const existing = await db.select().from(classSubjects).where(and(eq(classSubjects.classId, classId), eq(classSubjects.subjectId, subjectId))).limit(1);
  if (existing.length > 0) {
    await db.update(classSubjects).set({ teacherId, isClassTeacher }).where(eq(classSubjects.id, existing[0].id));
  } else {
    await db.insert(classSubjects).values({ classId, subjectId, teacherId, isClassTeacher });
  }
  if (isClassTeacher) {
    // only one class teacher per class
    await db.update(classSubjects).set({ isClassTeacher: false }).where(and(eq(classSubjects.classId, classId), sql`${classSubjects.id} != ${existing[0]?.id ?? -1}`));
  }
  const [c] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  const [sb] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  await logAudit(user.id, "Saved subject assignment", "classSubject", undefined, `${c?.name}: ${sb?.name}${teacherId ? " → teacher assigned" : ""}`);
  await flashTo("/classes?classId=" + classId, `Assignment saved for ${sb?.name} (${c?.name}).`);
}

export async function removeAssignment(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId") || 0);
  await db.delete(classSubjects).where(eq(classSubjects.id, id));
  await logAudit(user.id, "Removed subject assignment", "classSubject", id);
  await flashTo("/classes?classId=" + classId, "Assignment removed.");
}

export async function setClassTeacher(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  const row = (await db.select().from(classSubjects).where(eq(classSubjects.id, id)).limit(1))[0];
  if (!row) return;
  await db.update(classSubjects).set({ isClassTeacher: false }).where(eq(classSubjects.classId, classId));
  await db.update(classSubjects).set({ isClassTeacher: true }).where(eq(classSubjects.id, id));
  await logAudit(user.id, "Set class teacher", "classSubject", id);
  await flashTo("/classes?classId=" + classId, "Class teacher updated.");
}

/* ----------------------------------- Page ----------------------------------- */

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const selClass = sp.classId ? Number(sp.classId) : null;

  const [classesList, allSubjects, allTeachers, allSectionsRaw, activeEnr, csRows] = await Promise.all([
    db.select().from(classes).orderBy(classes.sortOrder),
    db.select().from(subjects).orderBy(subjects.name),
    db.select().from(teachers).where(eq(teachers.status, "active")).orderBy(teachers.name),
    db.select().from(sections),
    db.select({ classId: enrollments.classId }).from(enrollments).where(eq(enrollments.status, "active")),
    db
      .select({ classId: classSubjects.classId, teacherName: teachers.name, isCT: classSubjects.isClassTeacher })
      .from(classSubjects)
      .leftJoin(teachers, eq(teachers.id, classSubjects.teacherId)),
  ]);
  const classRows = classesList.map((c) => ({
    c,
    sectionCount: allSectionsRaw.filter((s) => s.classId === c.id).length,
    studentCount: activeEnr.filter((e) => e.classId === c.id).length,
    classTeacher: csRows.find((r) => r.classId === c.id && r.isCT)?.teacherName ?? null,
  }));

  const selRow = classRows.find((r) => r.c.id === selClass);
  const assignments = selClass
    ? await db
        .select({
          id: classSubjects.id,
          subject: subjects.name,
          teacher: teachers.name,
          teacherId: classSubjects.teacherId,
          isClassTeacher: classSubjects.isClassTeacher,
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
        .leftJoin(teachers, eq(teachers.id, classSubjects.teacherId))
        .where(eq(classSubjects.classId, selClass))
        .orderBy(subjects.name)
    : [];

  return (
    <>
      <PageHead title="Classes & Subjects" sub="Structure from ECD to Grade 10 — sections, class teachers and subject teachers" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {classRows.map((r) => (
          <a
            key={r.c.id}
            href={`/classes?classId=${r.c.id}`}
            className={`card p-4 block transition-all hover:-translate-y-0.5 hover:shadow-md ${selClass === r.c.id ? "ring-2 ring-forest border-forest" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-ink">{r.c.name}</span>
              <Badge tone={selClass === r.c.id ? "green" : "gray"}>{r.c.level}</Badge>
            </div>
            <div className="mt-2.5 space-y-1 text-xs text-inksoft">
              <div className="flex items-center gap-1.5"><Icon name="users" className="w-3.5 h-3.5 text-muted" /> {r.studentCount} students · {r.sectionCount} section{r.sectionCount === 1 ? "" : "s"}</div>
              <div className="flex items-center gap-1.5"><Icon name="user" className="w-3.5 h-3.5 text-muted" /> {r.classTeacher ? `CT: ${r.classTeacher}` : "No class teacher"}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-3.5">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink">
              {selRow ? <>Subject assignments — {selRow.c.name}</> : "Subject assignments"}
            </h3>
            {selRow?.c.name && <span className="text-xs text-muted">{assignments.length} subjects</span>}
          </div>
          {!selClass ? (
            <div className="p-5">
              <Empty icon="book" title="Select a class above" sub="Pick a class to view and manage its subjects, teachers and class teacher." />
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="tbl">
              <thead>
                <tr><th>Subject</th><th>Teacher</th><th>Class teacher</th>{isAdmin && <th className="text-right">Remove</th>}</tr>
              </thead>
              <tbody>
                {assignments.length === 0 && (
                  <tr><td colSpan={4}><span className="text-sm text-muted">No subjects assigned yet — add one with the form on the right.</span></td></tr>
                )}
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.subject}</td>
                    <td>{a.teacher ?? <span className="text-muted">Unassigned</span>}</td>
                    <td>
                      {a.isClassTeacher ? (
                        <Badge tone="amber">★ Class teacher</Badge>
                      ) : (
                        isAdmin && a.teacherId && (
                          <form action={setClassTeacher}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="classId" value={selClass} />
                            <button className="text-xs font-bold text-forest hover:underline cursor-pointer">Make class teacher</button>
                          </form>
                        )
                      )}
                    </td>
                    {isAdmin && (
                      <td className="text-right">
                        <ConfirmButton action={removeAssignment} icon="trash" title="Remove" message={`Remove ${a.subject} from this class?`} confirmText="Remove" fields={[{ name: "id", value: String(a.id) }, { name: "classId", value: String(selClass) }]} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="space-y-3.5">
          {isAdmin && selClass && (
            <div className="card p-4">
              <h3 className="font-bold text-sm text-ink mb-3">Assign subject & teacher</h3>
              <form action={saveAssignment} className="space-y-3">
                <input type="hidden" name="classId" value={selClass} />
                <Field label="Subject">
                  <select name="subjectId" className="inp" required>
                    <option value="">Select subject…</option>
                    {allSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Teacher">
                  <select name="teacherId" className="inp">
                    <option value="">— Unassigned —</option>
                    {allTeachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" name="isClassTeacher" className="accent-forest w-4 h-4" />
                  Make class teacher
                </label>
                <button className="btn-primary w-full">
                  <Icon name="plus" className="w-4 h-4" /> Assign
                </button>
              </form>
            </div>
          )}

          <div className="card p-4">
            <h3 className="font-bold text-sm text-ink mb-3">Sections</h3>
            {(!selClass || !selRow) ? (
              <p className="text-xs text-muted">Select a class to manage its sections.</p>
            ) : (
              <SectionManager classId={selClass} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

async function SectionManager({ classId }: { classId: number }) {
  const list = await db.select().from(sections).where(eq(sections.classId, classId)).orderBy(sections.name);
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {list.length === 0 && <span className="text-xs text-muted">No sections yet.</span>}
        {list.map((sec) => (
          <span key={sec.id} className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft border border-forest/20 pl-3 pr-1 py-0.5 text-xs font-bold text-forest">
            {sec.name}
            {isAdmin && (
              <ConfirmButton
                action={deleteSection}
                icon="x"
                className="px-1.5 py-0.5 rounded-full hover:bg-danger hover:text-white transition-colors"
                title="Remove section"
                message={`Remove section ${sec.name}?`}
                confirmText="Remove"
                fields={[{ name: "id", value: String(sec.id) }]}
              />
            )}
          </span>
        ))}
      </div>
      {isAdmin && (
        <form action={addSection} className="flex gap-2">
          <input type="hidden" name="classId" value={classId} />
          <input name="name" placeholder="e.g. A, B" className="inp flex-1" maxLength={3} required />
          <button className="btn-ghost shrink-0">
            <Icon name="plus" className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}
    </div>
  );
}
