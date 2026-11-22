import Link from "next/link";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
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
  notes,
  notices,
  auditLogs,
  users,
  parentChildren,
  academicYears,
  classSubjects,
  subjects,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { attendancePct, computeClassResults, fmtDate, todayStr, addDays, getScale } from "@/lib/grading";
import { Stat, Donut, Badge, Icon, Empty, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayStr();

  if (user.role === "admin") return <AdminDash today={today} />;
  if (user.role === "teacher") return <TeacherDash today={today} teacherId={user.teacherId!} userName={user.name} />;
  if (user.role === "student") return <StudentDash studentId={user.studentId!} userName={user.name} today={today} />;
  return <ParentDash userId={user.id} userName={user.name} today={today} />;
}

/* --------------------------------- ADMIN ---------------------------------- */

async function AdminDash({ today }: { today: string }) {
  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.status, "active")).limit(1);
  const [
    studentCount,
    teacherCount,
    classCount,
    todayAtt,
    upcoming,
    recentNotices,
    recentActivity,
    last7,
    scale,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(students).where(sql`${students.deletedAt} is null`),
    db.select({ c: sql<number>`count(*)::int` }).from(teachers).where(eq(teachers.status, "active")),
    db.select({ c: sql<number>`count(*)::int` }).from(classes),
    db
      .select({ status: attendance.status, c: sql<number>`count(*)::int` })
      .from(attendance)
      .where(eq(attendance.attDate, today))
      .groupBy(attendance.status),
    db
      .select()
      .from(examinations)
      .where(and(eq(examinations.status, "scheduled"), sql`${examinations.startDate} >= ${today}`))
      .orderBy(examinations.startDate)
      .limit(4),
    db.select().from(notices).orderBy(desc(notices.createdAt)).limit(4),
    db.select({ action: auditLogs.action, entity: auditLogs.entity, user: users.name, at: auditLogs.createdAt }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).orderBy(desc(auditLogs.createdAt)).limit(6),
    db.select().from(examinations).where(sql`${examinations.endDate} <= ${today} and ${examinations.status} != 'published'`).orderBy(desc(examinations.endDate)).limit(3),
    getScale(),
  ]);

  const present = (todayAtt.find((r) => r.status === "P")?.c ?? 0) + (todayAtt.find((r) => r.status === "L")?.c ?? 0);
  const absent = todayAtt.find((r) => r.status === "A")?.c ?? 0;
  const totalMarked = todayAtt.reduce((a, r) => a + r.c, 0);
  const pct = totalMarked === 0 ? 0 : Math.round((present / totalMarked) * 100);

  const latestPublished = await db
    .select()
    .from(examinations)
    .where(and(eq(examinations.status, "published"), activeYear ? eq(examinations.academicYearId, activeYear.id) : sql`true`))
    .orderBy(desc(examinations.endDate))
    .limit(1);

  let latestSummary: { cls: string; pct: number; gpa: number; count: number }[] = [];
  if (latestPublished[0]) {
    const clsList = await db.select().from(classes).orderBy(classes.sortOrder);
    const rows: { cls: string; pct: number; gpa: number; count: number }[] = [];
    for (const c of clsList.slice(-6)) {
      const res = await computeClassResults(latestPublished[0].id, c.id, scale);
      const done = res.filter((r) => r.totalObtained != null);
      if (done.length > 0) {
        rows.push({
          cls: c.name,
          pct: Math.round((done.reduce((a, r) => a + (r.pct ?? 0), 0) / done.length) * 10) / 10,
          gpa: Math.round((done.reduce((a, r) => a + (r.gpa ?? 0), 0) / done.length) * 10) / 10,
          count: done.length,
        });
      }
    }
    latestSummary = rows.slice(-6);
  }

  return (
    <>
      <PageHead title="Administrator Dashboard" sub="School overview — active academic year" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Stat label="Total Students" value={studentCount[0].c} sub="All records on file" icon="cap" tone="green" />
        <Stat label="Teachers & Staff" value={teacherCount[0].c} sub="Active" icon="users" tone="blue" />
        <Stat label="Classes" value={classCount[0].c} sub="ECD – Grade 10" icon="book" tone="amber" />
        <Stat label="Today's Attendance" value={totalMarked === 0 ? "Not marked" : `${pct}%`} sub={totalMarked === 0 ? "No attendance yet today" : `${present} present · ${absent} absent`} icon="clipboard" tone={pct >= 75 ? "green" : "red"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3.5 mt-3.5">
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-ink">Attendance today</h3>
            <Link href="/attendance" className="text-xs font-bold text-forest hover:underline">Open register →</Link>
          </div>
          {totalMarked === 0 ? (
            <Empty icon="clipboard" title="No attendance marked yet" sub="Today's register is still open." />
          ) : (
            <div className="flex items-center gap-5">
              <Donut value={pct} label="present" />
              <div className="space-y-2 text-sm flex-1">
                {[
                  { l: "Present", v: present, c: "bg-forest" },
                  { l: "Late", v: todayAtt.find((r) => r.status === "L")?.c ?? 0, c: "bg-saffron" },
                  { l: "Absent", v: absent, c: "bg-danger" },
                  { l: "On leave", v: todayAtt.find((r) => r.status === "LV")?.c ?? 0, c: "bg-info" },
                ].map((r) => (
                  <div key={r.l} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${r.c}`} />
                    <span className="text-inksoft flex-1">{r.l}</span>
                    <span className="font-bold">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-ink">Upcoming examinations</h3>
            <Link href="/examinations" className="text-xs font-bold text-forest hover:underline">All →</Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty icon="calendar" title="No scheduled exams" />
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-lg border border-linesoft bg-forest-mist/50 px-3 py-2.5">
                  <div className="w-9 h-9 rounded-lg bg-forest text-white flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold leading-none">{fmtDate(e.startDate).slice(0, 6)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{e.name}</div>
                    <div className="text-[11px] text-muted">{e.examType} · {fmtDate(e.startDate)} – {fmtDate(e.endDate)}</div>
                  </div>
                  <Badge tone="amber">{e.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-ink">Recent notices</h3>
            <Link href="/notices" className="text-xs font-bold text-forest hover:underline">All →</Link>
          </div>
          {recentNotices.length === 0 ? (
            <Empty icon="bell" title="No notices published" />
          ) : (
            <ul className="space-y-2.5">
              {recentNotices.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.priority === "important" ? "bg-saffron" : "bg-forest"}`} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold leading-snug line-clamp-1">{n.title}</div>
                    <div className="text-[11px] text-muted">{fmtDate(n.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3.5 mt-3.5">
        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink">
              Latest results{latestPublished[0] ? ` — ${latestPublished[0].name}` : ""}
            </h3>
            <Link href="/results" className="text-xs font-bold text-forest hover:underline">Results →</Link>
          </div>
          {latestSummary.length === 0 ? (
            <Empty icon="file" title="No published results yet" sub="Publish an examination to see class averages." />
          ) : (
            <div className="overflow-x-auto"><table className="tbl">
              <thead>
                <tr><th>Class</th><th>Students</th><th>Avg %</th><th>Avg GPA</th></tr>
              </thead>
              <tbody>
                {latestSummary.map((r) => (
                  <tr key={r.cls}>
                    <td className="font-bold">{r.cls}</td>
                    <td>{r.count}</td>
                    <td>
                      <span className={r.pct >= 75 ? "text-forest font-bold" : "text-danger font-bold"}>{r.pct}%</span>
                    </td>
                    <td className="font-bold">{r.gpa.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink">Recent system activity</h3>
            <Link href="/activity" className="text-xs font-bold text-forest hover:underline">Log →</Link>
          </div>
          <div className="overflow-x-auto"><table className="tbl">
            <thead>
              <tr><th>User</th><th>Action</th><th>When</th></tr>
            </thead>
            <tbody>
              {recentActivity.map((a, i) => (
                <tr key={i}>
                  <td className="font-semibold">{a.user ?? "System"}</td>
                  <td className="text-inksoft">
                    {a.action} {a.entity ? <span className="text-muted">({a.entity})</span> : null}
                  </td>
                  <td className="text-muted text-xs whitespace-nowrap">{fmtDate(a.at)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>

      {last7.length > 0 && (
        <div className="card p-4 mt-3.5 flex flex-wrap items-center gap-3 border-saffron/40 bg-saffron-soft/60">
          <Icon name="alert" className="w-4 h-4 text-saffron-dark" />
          <span className="text-sm font-semibold text-inksoft">
            {last7.length} examination{last7.length > 1 ? "s have" : " has"} ended without published results.
          </span>
          {last7.slice(0, 2).map((e) => (
            <Badge key={e.id} tone="amber">{e.name}</Badge>
          ))}
        </div>
      )}
    </>
  );
}

/* -------------------------------- TEACHER --------------------------------- */

async function TeacherDash({ today, teacherId, userName }: { today: string; teacherId: number; userName: string }) {
  const assignments = await db
    .select({
      className: classes.name,
      subjectName: subjects.name,
      isClassTeacher: classSubjects.isClassTeacher,
      sectionCount: sql<number>`(select count(*) from sections where sections.class_id = ${classes.id})::int`,
    })
    .from(classSubjects)
    .innerJoin(classes, eq(classes.id, classSubjects.classId))
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classSubjects.teacherId, teacherId))
    .orderBy(classes.sortOrder);

  const [pendingMarks, teacherNotes, noticesList, sectionsMine, todayDone] = await Promise.all([
    db
      .select({ examId: examSubjects.examId, examName: examinations.name, c: sql<number>`count(*)::int` })
      .from(examSubjects)
      .innerJoin(examinations, eq(examinations.id, examSubjects.examId))
      .where(and(eq(examinations.status, "completed"), sql`${examSubjects.id} not in (select m.exam_subject_id from marks m)`))
      .groupBy(examSubjects.examId, examinations.name)
      .limit(3),
    db.select().from(notes).where(eq(notes.uploadedById, teacherId)).orderBy(desc(notes.createdAt)).limit(4),
    db.select().from(notices).orderBy(desc(notices.createdAt)).limit(4),
    db
      .select({ section: sections.name, className: classes.name })
      .from(sections)
      .innerJoin(classes, eq(classes.id, sections.classId))
      .where(sql`${sections.classId} in (select class_id from class_subjects where teacher_id = ${teacherId})`),
    db.select({ c: sql<number>`count(*)::int` }).from(attendance).where(and(eq(attendance.markedById, teacherId), eq(attendance.attDate, today))),
  ]);

  const firstLast = userName.split(" ");
  const initials = (firstLast[0]?.[0] ?? "") + (firstLast[firstLast.length - 1]?.[0] ?? "");

  return (
    <>
      <PageHead title={`Namaste, ${userName.split(" ")[0]} ${initials ? `(${initials})` : ""}`} sub={`Teacher workspace · ${todayStr()}`} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Stat label="Assigned Subjects" value={assignments.length} sub="Across all classes" icon="book" tone="green" />
        <Stat label="Sections to Cover" value={sectionsMine.length} sub="Daily attendance" icon="clipboard" tone="blue" />
        <Stat label="Attendance Today" value={todayDone[0].c > 0 ? "Marked" : "Pending"} sub={todayDone[0].c > 0 ? `${todayDone[0].c} students recorded` : "Open the register"} icon="check" tone={todayDone[0].c > 0 ? "green" : "red"} />
        <Stat label="Study Materials" value={teacherNotes.length} sub="Uploaded by you" icon="folder" tone="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-3.5 mt-3.5">
        <div className="card p-5">
          <h3 className="font-bold text-sm text-ink mb-3">My classes & subjects</h3>
          {assignments.length === 0 ? (
            <Empty icon="book" title="No subjects assigned yet" sub="An administrator will assign your subjects from Classes & Subjects." />
          ) : (
            <ul className="space-y-2">
              {assignments.map((a, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-linesoft px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{a.className} <span className="text-muted font-medium">· {a.subjectName}</span></div>
                    {a.isClassTeacher && <Badge tone="amber">Class teacher</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-ink">Recent notices</h3>
            <Link href="/notices" className="text-xs font-bold text-forest hover:underline">All →</Link>
          </div>
          {noticesList.length === 0 ? (
            <Empty icon="bell" title="No notices yet" />
          ) : (
            <ul className="space-y-2.5">
              {noticesList.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.priority === "important" ? "bg-saffron" : "bg-forest"}`} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold line-clamp-1">{n.title}</div>
                    <div className="text-[11px] text-muted">{fmtDate(n.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* -------------------------------- STUDENT --------------------------------- */

async function StudentDash({ studentId, userName, today }: { studentId: number; userName: string; today: string }) {
  const [student, enrollee, upExams, studentNotices, classNotes] = await Promise.all([
    db.select().from(students).where(eq(students.id, studentId)).limit(1),
    db
      .select({ className: classes.name, section: sections.name, rollNo: enrollments.rollNo, year: sql<string>`academic_years.name`, classId: classes.id })
      .from(enrollments)
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .innerJoin(sections, eq(sections.id, enrollments.sectionId))
      .innerJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.status, "active")))
      .limit(1),
    db.select().from(examinations).where(and(eq(examinations.status, "scheduled"), sql`${examinations.startDate} >= ${today}`)).orderBy(examinations.startDate).limit(3),
    db
      .select()
      .from(notices)
      .where(sql`${notices.classId} is null or ${notices.classId} in (select class_id from enrollments where student_id = ${studentId} and status = 'active')`)
      .orderBy(desc(notices.createdAt))
      .limit(4),
    db
      .select()
      .from(notes)
      .where(sql`${notes.classId} in (select class_id from enrollments where student_id = ${studentId} and status = 'active')`)
      .orderBy(desc(notes.createdAt))
      .limit(4),
  ]);

  const s = student[0];
  const e = enrollee[0];
  const att = await attendancePct(studentId);
  const [latestExam] = await db
    .select({ name: examinations.name, id: examinations.id, endDate: examinations.endDate })
    .from(examinations)
    .where(and(eq(examinations.status, "published"), sql`${examinations.id} in (select exam_id from exam_subjects where class_id = ${e?.classId ?? 0})`))
    .orderBy(desc(examinations.endDate))
    .limit(1);

  let gpaDisplay = "—";
  if (latestExam && e) {
    const scale = await getScale();
    const res = await computeClassResults(latestExam.id, e.classId, scale);
    const mine = res.find((r) => r.studentId === studentId);
    if (mine && mine.gpa != null) gpaDisplay = mine.gpaDisplay;
  }

  return (
    <>
      <PageHead title={`Hello, ${s?.name ?? userName}`} sub={e ? `${e.className} – ${e.section} · Roll no. ${e.rollNo ?? "—"} · ${e.year}` : "Student workspace"} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Stat label="Attendance" value={`${att.pct}%`} sub={`${att.present} present of ${att.total} days`} icon="clipboard" tone={att.pct >= 75 ? "green" : "red"} />
        <Stat label="Latest GPA" value={gpaDisplay} sub={latestExam?.name ?? "No published result"} icon="file" tone="blue" />
        <Stat label="Admission No." value={s?.admissionNo ?? "—"} sub={s?.fatherName ? `S/O ${s.fatherName}` : undefined} icon="cap" tone="amber" />
        <Stat label="Upcoming Exams" value={upExams.length} sub={upExams[0] ? upExams[0].name : "None scheduled"} icon="calendar" tone="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-3.5 mt-3.5">
        <div className="card p-5">
          <h3 className="font-bold text-sm text-ink mb-4">My attendance</h3>
          <div className="flex justify-center">
            <Donut value={att.pct} label="present" size={120} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="rounded-lg bg-forest-mist py-2"><div className="font-extrabold text-forest">{att.present}</div><div className="text-[10px] font-bold uppercase text-muted">Present</div></div>
            <div className="rounded-lg bg-danger-soft py-2"><div className="font-extrabold text-danger">{att.absent}</div><div className="text-[10px] font-bold uppercase text-muted">Absent</div></div>
            <div className="rounded-lg bg-saffron-soft py-2"><div className="font-extrabold text-saffron-dark">{att.late + att.leave}</div><div className="text-[10px] font-bold uppercase text-muted">Late/Leave</div></div>
          </div>
          <Link href="/attendance" className="btn-ghost btn-sm w-full mt-4">Full history</Link>
        </div>
        <div className="card p-5">
          <h3 className="font-bold text-sm text-ink mb-3">Notices</h3>
          {studentNotices.length === 0 ? (
            <Empty icon="bell" title="No notices" />
          ) : (
            <ul className="space-y-2.5">
              {studentNotices.map((n) => (
                <li key={n.id} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${n.priority === "important" ? "bg-saffron" : "bg-forest"}`} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold line-clamp-1">{n.title}</div>
                    <div className="text-[11px] text-muted">{fmtDate(n.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {upExams.length > 0 && (
            <div className="mt-4 pt-3 border-t border-linesoft">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">Next examination</div>
              {upExams[0] && (
                <div className="text-sm font-bold">{upExams[0].name} <span className="text-muted font-medium">· {fmtDate(upExams[0].startDate)}</span></div>
              )}
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-ink">Study materials</h3>
            <Link href="/notes" className="text-xs font-bold text-forest hover:underline">All →</Link>
          </div>
          {classNotes.length === 0 ? (
            <Empty icon="folder" title="No materials yet" />
          ) : (
            <ul className="space-y-2">
              {classNotes.map((n) => (
                <li key={n.id} className="flex items-center gap-2.5 rounded-lg border border-linesoft px-3 py-2">
                  <Icon name="file" className="w-4 h-4 text-forest shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">{n.title}</div>
                    <div className="text-[11px] text-muted">{fmtDate(n.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* --------------------------------- PARENT --------------------------------- */

async function ParentDash({ userId, userName, today }: { userId: number; userName: string; today: string }) {
  const children = await db
    .select({ id: students.id, name: students.name, admissionNo: students.admissionNo })
    .from(parentChildren)
    .innerJoin(students, eq(students.id, parentChildren.studentId))
    .where(eq(parentChildren.userId, userId));

  const parentNotices = await db.select().from(notices).where(sql`${notices.classId} is null`).orderBy(desc(notices.createdAt)).limit(5);

  return (
    <>
      <PageHead title={`Namaste, ${userName.split(" ")[0]}`} sub="Parent & Guardian portal" />
      {children.length === 0 ? (
        <div className="card">
          <Empty icon="users" title="No children linked yet" sub="Please contact the school office to link your child(ren) to this account." />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3.5">
          {children.map((c) => (
            <ParentChildCard key={c.id} childId={c.id} name={c.name} admissionNo={c.admissionNo} today={today} />
          ))}
        </div>
      )}
      <div className="card p-5 mt-3.5">
        <h3 className="font-bold text-sm text-ink mb-3">School notices</h3>
        {parentNotices.length === 0 ? (
          <Empty icon="bell" title="No notices" />
        ) : (
          <ul className="space-y-2.5">
            {parentNotices.map((n) => (
              <li key={n.id} className="flex items-start gap-2.5">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${n.priority === "important" ? "bg-saffron" : "bg-forest"}`} />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold line-clamp-1">{n.title}</div>
                  <div className="text-[11px] text-muted">{fmtDate(n.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

async function ParentChildCard({ childId, name, admissionNo, today }: { childId: number; name: string; admissionNo: string; today: string }) {
  const [e] = await db
    .select({ className: classes.name, section: sections.name, rollNo: enrollments.rollNo, classId: classes.id })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .innerJoin(sections, eq(sections.id, enrollments.sectionId))
    .where(and(eq(enrollments.studentId, childId), eq(enrollments.status, "active")))
    .limit(1);
  const att = await attendancePct(childId);
  const [exam] = await db
    .select({ name: examinations.name, id: examinations.id, endDate: examinations.endDate })
    .from(examinations)
    .where(and(eq(examinations.status, "published"), sql`${examinations.id} in (select exam_id from exam_subjects where class_id = ${e?.classId ?? 0})`))
    .orderBy(desc(examinations.endDate))
    .limit(1);
  let gpa = "—";
  if (exam && e) {
    const scale = await getScale();
    const res = await computeClassResults(exam.id, e.classId, scale);
    const mine = res.find((r) => r.studentId === childId);
    if (mine?.gpa != null) gpa = mine.gpaDisplay;
  }
  return (
    <div className="card p-5 fade-up">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-11 h-11 rounded-full bg-forest text-white flex items-center justify-center font-extrabold">{name[0]}</span>
        <div>
          <div className="font-bold text-ink">{name}</div>
          <div className="text-xs text-muted">{admissionNo} · {e ? `${e.className} – ${e.section}` : "Not enrolled"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Donut value={att.pct} size={84} label="attendance" color={att.pct >= 75 ? "#1d5c3f" : "#b23a2f"} />
        <div className="text-right space-y-1.5">
          <div><span className="text-xs text-muted">Latest GPA</span><div className="font-extrabold text-lg text-forest">{gpa}</div></div>
          <Link href={`/results?student=${childId}`} className="text-xs font-bold text-forest hover:underline">View marksheets →</Link>
        </div>
      </div>
    </div>
  );
}
