import { eq, and, sql, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { classes, sections, students, enrollments, academicYears } from "@/db/schema";
import { requireRole, logAudit } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";
import { flashTo } from "@/actions/auth";
import { PageHead, Badge, Icon, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function promoteStudents(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const fromClass = Number(formData.get("fromClass"));
  const fromSection = formData.get("fromSection") ? Number(formData.get("fromSection")) : null;
  const toClass = Number(formData.get("toClass"));
  const toSection = formData.get("toSection") ? Number(formData.get("toSection")) : null;
  const ids = formData.getAll("ids").map(String).filter(Boolean).map(Number);
  if (!fromClass || !toClass) await flashTo("/promotion", "Select source and destination classes.", true);
  if (ids.length === 0) await flashTo("/promotion", "Select at least one student to promote.", true);

  const [activeYear] = await db.select().from(academicYears).where(and(eq(academicYears.status, "active"), eq(academicYears.schoolId, schoolId))).limit(1);
  if (!activeYear) {
    await flashTo("/promotion", "Create and activate an academic year first.", true);
    return;
  }
  // Keep promoted students in the active academic year so they stay visible in
  // class lists, reports and marksheets. Changing year is a separate admin action.
  const targetYearId = activeYear.id;

  const [toClassRow] = await db.select().from(classes).where(and(eq(classes.id, toClass), eq(classes.schoolId, schoolId))).limit(1);
  const maxRoll = await db
    .select({ r: sql<number>`coalesce(max(roll_no), 0)::int` })
    .from(enrollments)
    .where(and(eq(enrollments.classId, toClass), eq(enrollments.academicYearId, targetYearId), eq(enrollments.schoolId, schoolId)));

  let count = 0;
  for (let i = 0; i < ids.length; i++) {
    const sid = ids[i];
    const [enr] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, sid), eq(enrollments.classId, fromClass), eq(enrollments.status, "active"), eq(enrollments.schoolId, schoolId)))
      .limit(1);
    if (!enr) continue;
    await db.update(enrollments).set({ status: "promoted" }).where(and(eq(enrollments.id, enr.id), eq(enrollments.schoolId, schoolId)));
    await db.insert(enrollments).values({
      studentId: sid,
      classId: toClass,
      sectionId: toSection,
      rollNo: (maxRoll[0]?.r ?? 0) + 1 + i,
      academicYearId: targetYearId,
      admissionDate: enr.admissionDate,
      status: "active",
      schoolId,
    });
    count++;
  }

  await logAudit(user.id, "Promoted students", "promotion", undefined, `${count} student(s): Class ${fromClass} → ${toClassRow?.name}`);
  await flashTo(`/promotion?fromClass=${fromClass}&fromSection=${fromSection ?? ""}&toClass=${toClass}&toSection=${toSection ?? ""}`, `${count} student(s) promoted to ${toClassRow?.name}. Previous records preserved.`);
}

export default async function PromotionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("admin");
  const schoolId = await currentSchoolId();
  const sp = await searchParams;
  const fromClass = sp.fromClass ? Number(sp.fromClass) : null;
  const fromSection = sp.fromSection ? Number(sp.fromSection) : null;
  const toClass = sp.toClass ? Number(sp.toClass) : null;
  const toSection = sp.toSection ? Number(sp.toSection) : null;

  const [allClasses, allSections, activeYearRows] = await Promise.all([
    db.select().from(classes).where(eq(classes.schoolId, schoolId)).orderBy(classes.sortOrder),
    db.select().from(sections).where(eq(sections.schoolId, schoolId)).orderBy(sections.name),
    db.select().from(academicYears).where(and(eq(academicYears.status, "active"), eq(academicYears.schoolId, schoolId))).limit(1),
  ]);
  const activeYear = activeYearRows[0];

  let candidates: { student: (typeof students)["$inferSelect"]; rollNo: number | null }[] = [];
  if (fromClass) {
    candidates = await db
      .select({ student: students, rollNo: enrollments.rollNo })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
      fromSection
        ? and(eq(enrollments.classId, fromClass), eq(enrollments.sectionId, fromSection), eq(enrollments.status, "active"), eq(enrollments.schoolId, schoolId))
        : and(eq(enrollments.classId, fromClass), eq(enrollments.status, "active"), eq(enrollments.schoolId, schoolId)),
      )
      .orderBy(enrollments.rollNo);
  }

  const fromRow = allClasses.find((c) => c.id === fromClass);
  const toRow = allClasses.find((c) => c.id === toClass);

  return (
    <>
      <PageHead title="Student Promotion" sub={`Promote students from ${fromRow?.name ?? "…"} to ${toRow?.name ?? "…"} — history is retained`} />

      <div className="grid lg:grid-cols-3 gap-3.5">
        <div className="card p-4">
          <h3 className="font-bold text-sm text-ink mb-3">Configure promotion</h3>
          <form className="space-y-3">
            <label className="block">
              <span className="lbl">From class</span>
              <select name="fromClass" defaultValue={fromClass ?? ""} className="inp" required>
                <option value="">Select…</option>
                {allClasses.slice(0, -1).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">From section</span>
              <select name="fromSection" defaultValue={fromSection ?? ""} className="inp">
                <option value="">All sections</option>
                {allSections.filter((s) => s.classId === fromClass).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">To class</span>
              <select name="toClass" defaultValue={toClass ?? ""} className="inp" required>
                <option value="">Select…</option>
                {allClasses.slice(1).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">To section</span>
              <select name="toSection" defaultValue={toSection ?? ""} className="inp">
                <option value="">Same / default</option>
                {allSections.filter((s) => s.classId === toClass).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <button className="btn-primary w-full">
              <Icon name="search" className="w-4 h-4" /> Load students
            </button>
            <p className="text-[11px] text-muted leading-relaxed">
              Active year: <span className="font-bold text-ink">{activeYear?.name ?? "—"}</span>. Promoted students receive new
              enrolments in <span className="font-bold text-ink">{activeYear ? `${parseInt(activeYear.name.split("/")[0], 10) + 1}/${parseInt(activeYear.name.split("/")[0], 10) + 2}` : "next year"}</span> with
              auto roll numbers; their previous-year records stay in academic history.
            </p>
          </form>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink">Students to promote</h3>
            {fromClass && <Badge tone="green">{candidates.length} found</Badge>}
          </div>
          {!fromClass || !toClass ? (
            <Empty icon="arrow" title="Configure and load" sub="Choose source and destination classes, then load the roster." />
          ) : candidates.length === 0 ? (
            <Empty icon="cap" title="No active students in that class" />
          ) : (
            <form action={promoteStudents}>
              <input type="hidden" name="fromClass" value={fromClass} />
              <input type="hidden" name="fromSection" value={fromSection ?? ""} />
              <input type="hidden" name="toClass" value={toClass} />
              <input type="hidden" name="toSection" value={toSection ?? ""} />
              <div className="overflow-x-auto">
                <table className="tbl min-w-[560px]">
                  <thead>
                    <tr><th className="w-10">Sel</th><th>Roll</th><th>Student</th><th>Adm. No.</th><th>Will become</th></tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.student.id}>
                        <td>
                          <input type="checkbox" name="ids" value={c.student.id} defaultChecked className="accent-forest w-4 h-4" />
                        </td>
                        <td>{c.rollNo ?? "—"}</td>
                        <td className="font-semibold">{c.student.name}</td>
                        <td className="font-mono text-xs text-inksoft">{c.student.admissionNo}</td>
                        <td className="text-inksoft">{toRow?.name}{toSection ? ` – ${allSections.find((s) => s.id === toSection)?.name}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3.5 border-t border-line flex items-center justify-between">
                <span className="text-xs text-muted">Previous-grade enrolments are marked as promoted.</span>
                <button className="btn-saffron">
                  <Icon name="arrow" className="w-4 h-4" /> Promote selected
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
