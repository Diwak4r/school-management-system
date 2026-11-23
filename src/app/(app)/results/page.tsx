import Link from "next/link";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  examinations,
  examSubjects,
  classes,
  subjects,
  classSubjects,
  enrollments,
  students,
  parentChildren,
  academicYears,
} from "@/db/schema";
import { requireUser, requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { computeClassResults, fmtDate, getScale, StudentResult } from "@/lib/grading";
import { PageHead, Badge, Icon, Empty, Field } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function setExamStatus(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["scheduled", "completed", "published"].includes(status)) await flashTo("/results", "Invalid status.", true);
  if (status === "published") {
    // warn if marks are incomplete anywhere
    const missing = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(examSubjects)
      .where(and(eq(examSubjects.examId, id), sql`${examSubjects.id} not in (select m.exam_subject_id from marks m)`));
    if (missing[0].c > 0) {
      await flashTo(`/results?exam=${id}`, `Cannot publish: ${missing[0].c} subject group(s) have no marks entered at all. Enter marks first.`, true);
      return;
    }
  }
  const [row] = await db.select().from(examinations).where(eq(examinations.id, id)).limit(1);
  await db.update(examinations).set({ status }).where(eq(examinations.id, id));
  await logAudit(user.id, status === "published" ? "Published results" : "Changed exam status", "exam", id, `${row?.name} → ${status}`);
  await flashTo(`/results?exam=${id}`, status === "published" ? "Results published — marks are now locked." : `Examination status set to “${status}”.`);
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;

  if (user.role === "student") return <MyResults studentId={user.studentId!} initialStudent={null} />;
  if (user.role === "parent") return <MyResults studentId={null} userId={user.id} initialStudent={sp.student ? Number(sp.student) : null} />;

  const isAdmin = user.role === "admin";
  const scale = await getScale();

  const [exams, allClasses] = await Promise.all([
    db
      .select({ id: examinations.id, name: examinations.name, status: examinations.status, endDate: examinations.endDate, year: sql<string>`academic_years.name` })
      .from(examinations)
      .innerJoin(academicYears, eq(academicYears.id, examinations.academicYearId))
      .orderBy(desc(examinations.id)),
    db.select().from(classes).orderBy(classes.sortOrder),
  ]);

  const examId = sp.exam ? Number(sp.exam) : exams[0]?.id ?? null;
  const exam = exams.find((e) => e.id === examId);

  // restrict classes for teacher
  let classList = allClasses;
  if (user.role === "teacher") {
    if (exam) {
      const mine = await db
        .select({ classId: examSubjects.classId })
        .from(examSubjects)
        .innerJoin(classSubjects, and(eq(classSubjects.classId, examSubjects.classId), eq(classSubjects.subjectId, examSubjects.subjectId)))
        .where(and(eq(examSubjects.examId, exam.id), eq(classSubjects.teacherId, user.teacherId!)));
      const ids = new Set(mine.map((m) => m.classId));
      classList = allClasses.filter((c) => ids.has(c.id));
    } else {
      classList = [];
    }
  }

  const requestedClassId = sp.classId ? Number(sp.classId) : null;
  const classId = classList.some((c) => c.id === requestedClassId) ? requestedClassId : classList[0]?.id ?? null;
  const results: StudentResult[] = exam && classId ? await computeClassResults(exam.id, classId, scale) : [];
  const done = results.filter((r) => r.totalObtained != null);
  const passCount = results.filter((r) => r.result === "PASS").length;

  return (
    <>
      <PageHead title="Results" sub="Class-wise results with automatic grades, percentage and GPA" />

      <div className="card p-3.5 mb-4">
        <form method="GET" action="/results" className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <Field label="Examination">
            <select name="exam" defaultValue={exam?.id ?? ""} className="inp">
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ? {e.year} ({e.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select name="classId" defaultValue={classId ?? ""} className="inp">
              {classList.length === 0 && <option value="">? no classes ?</option>}
              {classList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Load results</button>
          </div>
        </form>
        {isAdmin && exam && (
          <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
            <form action={setExamStatus} className="flex gap-2">
              <input type="hidden" name="id" value={exam.id} />
              <input type="hidden" name="status" value={exam.status === "published" ? "completed" : "published"} />
              <button className={exam.status === "published" ? "btn-ghost" : "btn-saffron"}>
                <Icon name={exam.status === "published" ? "refresh" : "check"} className="w-4 h-4" />
                {exam.status === "published" ? "Reopen (unlock)" : "Publish & lock"}
              </button>
            </form>
            {exam.status === "published" && (
              <span className="badge bg-forest-soft text-forest border border-forest/20 h-fit">Locked</span>
            )}
          </div>
        )}
      </div>

      {exam && classId && (
        <div className="grid grid-cols-3 gap-3.5 mb-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-extrabold text-ink">{done.length}/{results.length}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mt-1">Marks entered</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-extrabold text-forest">{passCount}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mt-1">Passed</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-extrabold text-ink">
              {done.length > 0 ? (Math.round((done.reduce((a, r) => a + (r.pct ?? 0), 0) / done.length) * 10) / 10).toFixed(1) + "%" : "—"}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mt-1">Class average</div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {!exam || classList.length === 0 ? (
          <Empty icon="file" title="Nothing to show" sub="Select an examination and class." />
        ) : results.length === 0 ? (
          <Empty icon="cap" title="No students enrolled" sub="There are no active students in this class for this year." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[720px]">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  {Array.from(new Set(results.flatMap((r) => r.rows.map((x) => x.subjectName)))).slice(0, 8).map((sname) => (
                    <th key={sname} className="text-center">{sname}</th>
                  ))}
                  <th className="text-center">Total</th>
                  <th className="text-center">%</th>
                  <th className="text-center">GPA</th>
                  <th>Result</th>
                  <th className="text-right">Marksheet</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const subjects = Array.from(new Set(results.flatMap((x) => x.rows.map((y) => y.subjectName)))).slice(0, 8);
                  return (
                    <tr key={r.studentId}>
                      <td className="text-muted">{r.rollNo ?? "—"}</td>
                      <td className="font-semibold">{r.studentName}</td>
                      {subjects.map((sname) => {
                        const row = r.rows.find((x) => x.subjectName === sname);
                        return (
                          <td key={sname} className="text-center">
                            {row?.total == null ? <span className="text-muted">—</span> : <span className={row.pass ? "" : "text-danger font-bold"}>{row.total}</span>}
                          </td>
                        );
                      })}
                      <td className="text-center font-bold">{r.totalObtained ?? "—"}<span className="text-muted font-normal text-xs">/{r.totalFull}</span></td>
                      <td className="text-center font-bold">{r.pct != null ? `${r.pct}%` : "—"}</td>
                      <td className="text-center font-extrabold text-forest">{r.gpaDisplay}</td>
                      <td>{r.result === "PASS" ? <Badge tone="green">PASS</Badge> : r.result === "FAIL" ? <Badge tone="red">FAIL</Badge> : <Badge tone="amber">PENDING</Badge>}</td>
                      <td className="text-right">
                        <Link href={`/marksheet?exam=${exam.id}&student=${r.studentId}`} className="inline-flex items-center gap-1 text-xs font-bold text-forest hover:underline">
                          <Icon name="file" className="w-3.5 h-3.5" /> Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4 mt-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">Nepal government grading scale (configurable in Settings)</div>
        <div className="flex flex-wrap gap-1.5">
          {scale.map((g) => (
            <span key={g.grade} className={`badge ${g.isFail ? "bg-danger-soft text-danger border border-danger/20" : "bg-forest-mist text-inksoft border border-linesoft"}`}>
              {g.grade} · {g.minPct}–{g.maxPct}% · {(g.points10 / 10).toFixed(1)}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ----------------------------- Student / parent ---------------------------- */

async function MyResults({ studentId, userId, initialStudent }: { studentId: number | null; userId?: number; initialStudent: number | null }) {
  const scale = await getScale();
  let children: { id: number; name: string }[] = [];
  let effStudent: number | null = studentId;
  if (!studentId && userId) {
    children = await db
      .select({ id: students.id, name: students.name })
      .from(parentChildren)
      .innerJoin(students, eq(students.id, parentChildren.studentId))
      .where(eq(parentChildren.userId, userId));
    effStudent = initialStudent && children.find((c) => c.id === initialStudent) ? initialStudent : children[0]?.id ?? null;
  }

  if (!effStudent) {
    return (
      <>
        <PageHead title="Results & Marksheets" sub="My records" />
        <div className="card"><Empty icon="file" title="No linked child" sub="Contact the school office to link your child." /></div>
      </>
    );
  }

  const [enr] = await db.select().from(enrollments).where(and(eq(enrollments.studentId, effStudent), eq(enrollments.status, "active"))).limit(1);
  const list: { exam: any; gpa: string; pct: number | null; result: string }[] = [];
  if (enr) {
    const exams = await db
      .select({ id: examinations.id, name: examinations.name, endDate: examinations.endDate, year: sql<string>`academic_years.name` })
      .from(examinations)
      .innerJoin(academicYears, eq(academicYears.id, examinations.academicYearId))
      .where(and(eq(examinations.status, "published"), sql`${examinations.id} in (select exam_id from exam_subjects where class_id = ${enr.classId})`))
      .orderBy(desc(examinations.endDate));
    for (const e of exams) {
      const res = await computeClassResults(e.id, enr.classId, scale);
      const mine = res.find((r) => r.studentId === effStudent);
      if (mine) list.push({ exam: e, gpa: mine.gpaDisplay, pct: mine.pct, result: mine.result });
    }
  }

  return (
    <>
      <PageHead title="Results & Marksheets" sub="Published examinations only">
        {children.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {children.map((c) => (
              <Link key={c.id} href={`/results?student=${c.id}`} className={`btn-sm ${effStudent === c.id ? "btn-primary" : "btn-ghost"}`}>{c.name}</Link>
            ))}
          </div>
        )}
      </PageHead>
      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <Empty icon="file" title="No published results yet" sub="Your marksheets will appear here once results are published." />
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Examination</th><th>Academic year</th><th>Percentage</th><th>GPA</th><th>Result</th><th className="text-right">Marksheet</th></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.exam.id}>
                  <td className="font-bold">{r.exam.name}</td>
                  <td className="text-muted">{r.exam.year}</td>
                  <td>{r.pct != null ? `${r.pct}%` : "—"}</td>
                  <td className="font-extrabold text-forest">{r.gpa}</td>
                  <td>{r.result === "PASS" ? <Badge tone="green">PASS</Badge> : r.result === "PENDING" ? <Badge tone="gray">PENDING</Badge> : <Badge tone="red">FAIL</Badge>}</td>
                  <td className="text-right">
                    <Link href={`/marksheet?exam=${r.exam.id}&student=${effStudent}`} className="inline-flex items-center gap-1.5 btn-ghost btn-sm">
                      <Icon name="printer" className="w-3.5 h-3.5" /> View / print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
