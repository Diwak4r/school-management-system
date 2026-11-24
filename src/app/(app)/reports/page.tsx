import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  students,
  teachers,
  classes,
  sections,
  enrollments,
  attendance,
  examinations,
  examSubjects,
  subjects,
  classSubjects,
  academicYears,
  notes,
  marks,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { computeClassResults, fmtDate, gradeFor, getScale, todayStr, addDays } from "@/lib/grading";
import { currentSchoolId } from "@/lib/tenant";
import { PageHead, Badge, Icon, Empty, PrintButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const REPORTS = [
  { id: "students", label: "Student list", icon: "cap" },
  { id: "classwise", label: "Class-wise students", icon: "book" },
  { id: "attendance", label: "Attendance (30 days)", icon: "clipboard" },
  { id: "results", label: "Examination results", icon: "file" },
  { id: "subject", label: "Subject-wise results", icon: "pen" },
  { id: "grade", label: "Grade distribution", icon: "chart" },
  { id: "teachers", label: "Teachers", icon: "users" },
  { id: "year", label: "Academic year summary", icon: "calendar" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole("admin");
  const schoolId = await currentSchoolId();
  const sp = await searchParams;
  const r = sp.r ? String(sp.r) : "students";
  const scale = await getScale(schoolId);

  const [allClasses, activeYear] = await Promise.all([
    db.select().from(classes).where(eq(classes.schoolId, schoolId)).orderBy(classes.sortOrder),
    db.select().from(academicYears).where(and(eq(academicYears.status, "active"), eq(academicYears.schoolId, schoolId))).limit(1),
  ]);
  const yearId = activeYear[0]?.id ?? null;

  let title = "";
  let csvHref: string | null = null;
  let body: React.ReactNode = null;

  if (r === "students") {
    title = "Student list";
    csvHref = "/api/data?op=export&type=students";
    const rows = await db
      .select({
        name: students.name,
        adm: students.admissionNo,
        gender: students.gender,
        cls: classes.name,
        sec: sections.name,
        roll: enrollments.rollNo,
        father: students.fatherName,
        contact: students.contact,
      })
      .from(students)
      .leftJoin(enrollments, and(eq(enrollments.studentId, students.id), eq(enrollments.status, "active"), eq(enrollments.schoolId, schoolId), yearId ? eq(enrollments.academicYearId, yearId) : sql`false`))
      .leftJoin(classes, and(eq(classes.id, enrollments.classId), eq(classes.schoolId, schoolId)))
      .leftJoin(sections, and(eq(sections.id, enrollments.sectionId), eq(sections.schoolId, schoolId)))
      .where(and(sql`${students.deletedAt} is null`, eq(students.schoolId, schoolId)))
      .orderBy(students.name)
      .limit(500);
    body = (
      <table className="tbl">
        <thead><tr><th>Student</th><th>Adm. No.</th><th>Class</th><th>Sec</th><th>Roll</th><th>Gender</th><th>Father</th><th>Contact</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.adm}>
              <td className="font-semibold">{x.name}</td>
              <td className="font-mono text-xs">{x.adm}</td>
              <td>{x.cls ?? "—"}</td>
              <td>{x.sec ?? "—"}</td>
              <td>{x.roll ?? "—"}</td>
              <td>{x.gender ?? "—"}</td>
              <td>{x.father ?? "—"}</td>
              <td>{x.contact ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (r === "classwise") {
    title = "Class-wise students";
    csvHref = "/api/data?op=export&type=classes";

    const [sectionCounts, studentCounts, classTeacherRows] = await Promise.all([
      db
        .select({
          classId: sections.classId,
          count: sql<number>`count(*)::int`,
        })
        .from(sections)
        .where(eq(sections.schoolId, schoolId))
        .groupBy(sections.classId),

      db
        .select({
          classId: enrollments.classId,
          count: sql<number>`count(*)::int`,
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.schoolId, schoolId),
            yearId
              ? and(
                  eq(enrollments.status, "active"),
                  eq(enrollments.academicYearId, yearId),
                )
              : eq(enrollments.status, "active"),
          ),
        )
        .groupBy(enrollments.classId),

      db
        .select({
          classId: classSubjects.classId,
          name: teachers.name,
        })
        .from(classSubjects)
        .leftJoin(teachers, and(eq(teachers.id, classSubjects.teacherId), eq(teachers.schoolId, schoolId)))
        .where(and(eq(classSubjects.isClassTeacher, true), eq(classSubjects.schoolId, schoolId))),
    ]);

    const sectionCountByClass = new Map<number, number>();
    for (const item of sectionCounts) {
      sectionCountByClass.set(item.classId, item.count);
    }

    const studentCountByClass = new Map<number, number>();
    for (const item of studentCounts) {
      studentCountByClass.set(item.classId, item.count);
    }

    const teacherByClass = new Map<number, string>();
    for (const item of classTeacherRows) {
      if (item.name && !teacherByClass.has(item.classId)) {
        teacherByClass.set(item.classId, item.name);
      }
    }

    const rows = allClasses.map((c) => ({
      name: c.name,
      level: c.level,
      sections: sectionCountByClass.get(c.id) ?? 0,
      students: studentCountByClass.get(c.id) ?? 0,
      teacher: teacherByClass.get(c.id) ?? null,
    }));

    body = (
      <table className="tbl">
        <thead>
          <tr>
            <th>Class</th>
            <th>Level</th>
            <th>Sections</th>
            <th>Active students</th>
            <th>Class teacher</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.name}>
              <td className="font-bold">{x.name}</td>
              <td><Badge tone="gray">{x.level}</Badge></td>
              <td>{x.sections}</td>
              <td className="font-bold">{x.students}</td>
              <td>{x.teacher ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );} else if (r === "attendance") {
    title = "Attendance by class (last 30 days)";
    const from = addDays(new Date(), -29);
    const rows: { cls: string; pct: number; marked: number }[] = [];
    for (const c of allClasses) {
      const ag = await db
        .select({ s: attendance.status, c: sql<number>`count(*)::int` })
        .from(attendance)
        .where(and(eq(attendance.schoolId, schoolId), sql`${attendance.attDate} >= ${from}`, sql`${attendance.attDate} <= ${todayStr()}`, sql`${attendance.studentId} in (select student_id from enrollments where class_id = ${c.id} and school_id = ${schoolId} and status = 'active')`))
        .groupBy(attendance.status);
      let t = 0, p = 0;
      for (const a of ag) { t += a.c; if (a.s === "P" || a.s === "L") p += a.c; }
      rows.push({ cls: c.name, pct: t ? Math.round((p / t) * 1000) / 10 : 0, marked: t });
    }
    body = (
      <table className="tbl">
        <thead><tr><th>Class</th><th>Records</th><th>Average attendance</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.cls}>
              <td className="font-bold">{x.cls}</td>
              <td>{x.marked}</td>
              <td className="font-bold">{x.marked ? `${x.pct}%` : "—"}</td>
              <td>{x.marked ? (x.pct >= 75 ? <Badge tone="green">OK</Badge> : <Badge tone="red">Below 75%</Badge>) : <Badge tone="gray">No data</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (r === "results" || r === "subject" || r === "grade") {
    const [exam] = await db
      .select()
      .from(examinations)
      .where(and(eq(examinations.status, "published"), eq(examinations.schoolId, schoolId)))
      .orderBy(desc(examinations.endDate))
      .limit(1);
    if (!exam) {
      body = <Empty icon="file" title="No published examination yet" sub="Publish an examination to generate result reports." />;
    } else if (r === "results") {
      title = `Results — ${exam.name}`;
      const rows: { cls: string; total: number; done: number; pass: number; avgPct: number; avgGpa: number }[] = [];
      for (const c of allClasses) {
        const res = await computeClassResults(exam.id, c.id, scale, schoolId);
        const done = res.filter((x) => x.totalObtained != null);
        if (done.length === 0) continue;
        rows.push({
          cls: c.name,
          total: res.length,
          done: done.length,
          pass: res.filter((x) => x.result === "PASS").length,
          avgPct: Math.round((done.reduce((a, x) => a + (x.pct ?? 0), 0) / done.length) * 10) / 10,
          avgGpa: Math.round((done.reduce((a, x) => a + (x.gpa ?? 0), 0) / done.length) * 10) / 10,
        });
      }
      body = (
        <table className="tbl">
          <thead><tr><th>Class</th><th>Enrolled</th><th>Marks entered</th><th>Passed</th><th>Pass rate</th><th>Avg %</th><th>Avg GPA</th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.cls}>
                <td className="font-bold">{x.cls}</td>
                <td>{x.total}</td>
                <td>{x.done}</td>
                <td className="font-bold text-forest">{x.pass}</td>
                <td>{x.done ? `${Math.round((x.pass / x.done) * 100)}%` : "—"}</td>
                <td>{x.avgPct}%</td>
                <td className="font-bold">{x.avgGpa.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (r === "subject") {
      title = `Subject-wise results — ${exam.name}`;
      const rows: { cls: string; subject: string; avg: number; pass: number; total: number }[] = [];
      for (const c of allClasses) {
        const res = await computeClassResults(exam.id, c.id, scale, schoolId);
        if (res.length === 0) continue;
        const done = res.filter((x) => x.totalObtained != null);
        for (const subj of new Set(res.flatMap((x) => x.rows.map((y) => y.subjectName)))) {
          const cell = done.map((x) => x.rows.find((y) => y.subjectName === subj)).filter(Boolean) as any[];
          if (cell.length === 0) continue;
          rows.push({
            cls: c.name,
            subject: subj,
            avg: Math.round((cell.reduce((a, y) => a + (y.pct ?? 0), 0) / cell.length) * 10) / 10,
            pass: cell.filter((y) => y.pass).length,
            total: cell.length,
          });
        }
      }
      rows.sort((a, b) => a.cls.localeCompare(b.cls) || a.subject.localeCompare(b.subject));
      body = (
        <table className="tbl">
          <thead><tr><th>Class</th><th>Subject</th><th>Students</th><th>Avg %</th><th>Pass rate</th></tr></thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={i}>
                <td className="font-bold">{x.cls}</td>
                <td>{x.subject}</td>
                <td>{x.total}</td>
                <td className={x.avg >= 75 ? "font-bold text-forest" : x.avg < 50 ? "font-bold text-danger" : "font-bold"}>{x.avg}%</td>
                <td>{Math.round((x.pass / x.total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      title = `Grade distribution — ${exam.name}`;
      const counts: Record<string, number> = {};
      let total = 0;
      for (const c of allClasses) {
        const res = await computeClassResults(exam.id, c.id, scale, schoolId);
        for (const x of res) {
          if (x.totalObtained == null || x.pct == null) continue;
          const g = gradeFor(x.pct, scale).grade;
          counts[g] = (counts[g] ?? 0) + 1;
          total++;
        }
      }
      const max = Math.max(1, ...Object.values(counts));
      body = (
        <div className="p-5 space-y-2.5">
          {scale.map((g) => {
            const n = counts[g.grade] ?? 0;
            return (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="w-8 text-sm font-extrabold">{g.grade}</span>
                <div className="flex-1 h-5 rounded-md bg-linesoft overflow-hidden">
                  <div className={`h-full rounded-md ${g.isFail ? "bg-danger" : "bg-forest"}`} style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="w-16 text-right text-sm font-bold">{n} <span className="text-muted font-medium text-xs">({total ? Math.round((n / total) * 100) : 0}%)</span></span>
              </div>
            );
          })}
        </div>
      );
    }
  } else if (r === "teachers") {
    title = "Teachers & staff";
    csvHref = "/api/data?op=export&type=teachers";
    const rows = await db
      .select({
        t: teachers,
        subjects: sql<number>`(select count(*) from class_subjects where class_subjects.teacher_id = ${teachers.id} and class_subjects.school_id = ${schoolId})::int`,
      })
      .from(teachers)
      .where(eq(teachers.schoolId, schoolId))
      .orderBy(teachers.name);
    body = (
      <table className="tbl">
        <thead><tr><th>Teacher</th><th>Employee No.</th><th>Phone</th><th>Qualification</th><th>Subjects</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map(({ t, subjects }) => (
            <tr key={t.id} className={t.status !== "active" ? "opacity-60" : ""}>
              <td className="font-semibold">{t.name}</td>
              <td className="font-mono text-xs">{t.employeeNo}</td>
              <td>{t.phone ?? "—"}</td>
              <td>{t.qualification ?? "—"}</td>
              <td>{subjects}</td>
              <td>{t.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    title = "Academic year summary";
    const years = await db
      .select({
        y: academicYears,
        students: sql<number>`(select count(*) from enrollments where enrollments.academic_year_id = ${academicYears.id} and enrollments.school_id = ${schoolId})::int`,
        exams: sql<number>`(select count(*) from examinations where examinations.academic_year_id = ${academicYears.id} and examinations.school_id = ${schoolId})::int`,
        notes: sql<number>`(select count(*) from notes where notes.academic_year_id = ${academicYears.id} and notes.school_id = ${schoolId})::int`,
      })
      .from(academicYears)
      .where(eq(academicYears.schoolId, schoolId))
      .orderBy(desc(academicYears.id));
    body = (
      <table className="tbl">
        <thead><tr><th>Year</th><th>Status</th><th>Enrolments</th><th>Examinations</th><th>Study materials</th><th>Created</th></tr></thead>
        <tbody>
          {years.map(({ y, students, exams, notes }) => (
            <tr key={y.id}>
              <td className="font-bold">{y.name}</td>
              <td>{y.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Archived</Badge>}</td>
              <td>{students}</td>
              <td>{exams}</td>
              <td>{notes}</td>
              <td className="text-xs text-muted">{fmtDate(y.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <PageHead title="Reports" sub="View online, print, or export to CSV">
        {csvHref && (
          <a href={csvHref} className="btn-ghost"><Icon name="download" className="w-4 h-4" /> Export CSV</a>
        )}
        <PrintButton />
      </PageHead>

      <div className="flex gap-1.5 flex-wrap mb-4 no-print">
        {REPORTS.map((x) => (
          <a key={x.id} href={`/reports?r=${x.id}`} className={`btn-sm ${r === x.id ? "btn-primary" : "btn-ghost"}`}>
            <Icon name={x.icon} className="w-3.5 h-3.5" /> {x.label}
          </a>
        ))}
      </div>

      <div className="card overflow-hidden print-area">
        <div className="px-5 pt-4 pb-2 no-print">
          <h3 className="font-bold text-sm text-ink">{title}</h3>
        </div>
        <div className="overflow-x-auto">{body}</div>
      </div>
    </>
  );
}

