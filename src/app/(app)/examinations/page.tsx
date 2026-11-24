import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { examinations, examSubjects, academicYears, classes, sections, subjects, classSubjects, teachers, enrollments, parentChildren } from "@/db/schema";
import { requireUser, requireRole, logAudit } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";
import { flashTo } from "@/actions/auth";
import { fmtDate, todayStr, addDays } from "@/lib/grading";
import { PageHead, Badge, FormModal, ModalCancel, Field, ConfirmButton, Icon, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

const EXAM_TYPES = ["First Terminal Examination", "Second Terminal Examination", "Final Examination", "Unit Test", "Internal Assessment", "Practical Examination"];

/* ---------------------------------- Actions --------------------------------- */

export async function saveExam(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const name = String(formData.get("name") ?? "").trim();
  const examType = String(formData.get("examType") ?? "Unit Test");
  const academicYearId = Number(formData.get("academicYearId"));
  const startDate = s(formData.get("startDate"));
  const endDate = s(formData.get("endDate"));
  const status = String(formData.get("status") ?? "scheduled");
  if (!name) await flashTo("/examinations", "Examination name is required.", true);
  if (!academicYearId) await flashTo("/examinations", "Select an academic year.", true);
  if (id) {
    await db.update(examinations).set({ name, examType, academicYearId, startDate, endDate, status }).where(and(eq(examinations.id, id), eq(examinations.schoolId, schoolId)));
    await logAudit(user.id, "Updated examination", "exam", id, name);
    await flashTo("/examinations", "Examination updated.");
  } else {
    const [row] = await db.insert(examinations).values({ name, examType, academicYearId, startDate, endDate, status, schoolId }).returning({ id: examinations.id });
    await logAudit(user.id, "Created examination", "exam", row.id, name);
    await flashTo(`/examinations?exam=${row.id}`, `${name} created. Now configure subjects and full marks.`);
  }
}

export async function deleteExam(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(examinations).where(and(eq(examinations.id, id), eq(examinations.schoolId, schoolId))).limit(1);
  await db.delete(examinations).where(and(eq(examinations.id, id), eq(examinations.schoolId, schoolId)));
  await logAudit(user.id, "Deleted examination", "exam", id, row?.name);
  await flashTo("/examinations", "Examination deleted along with its subject configuration.");
}

export async function saveExamSubject(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const examId = Number(formData.get("examId"));
  const classId = Number(formData.get("classId"));
  const subjectId = Number(formData.get("subjectId"));
  const fullMarks = Number(formData.get("fullMarks") ?? 100);
  const practicalMarks = Number(formData.get("practicalMarks") ?? 0);
  const passMarks = Number(formData.get("passMarks") ?? 40);
  if (!examId || !classId || !subjectId) await flashTo("/examinations", "Complete the subject form.", true);
  if (practicalMarks >= fullMarks || practicalMarks < 0 || fullMarks <= 0) await flashTo("/examinations", "Full marks must be positive and practical marks must be less than full marks.", true);
  const existing = await db.select().from(examSubjects).where(and(eq(examSubjects.examId, examId), eq(examSubjects.classId, classId), eq(examSubjects.subjectId, subjectId), eq(examSubjects.schoolId, schoolId))).limit(1);
  if (existing.length > 0) {
    await db.update(examSubjects).set({ fullMarks, practicalMarks, passMarks }).where(and(eq(examSubjects.id, existing[0].id), eq(examSubjects.schoolId, schoolId)));
  } else {
    await db.insert(examSubjects).values({ examId, classId, subjectId, fullMarks, practicalMarks, passMarks, schoolId });
  }
  await logAudit(user.id, "Configured exam subject", "examSubject", undefined, `exam ${examId}`);
  await flashTo(`/examinations?exam=${examId}`, "Subject configuration saved.");
}

export async function bulkAddExamSubjects(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const examId = Number(formData.get("examId"));
  const classId = Number(formData.get("classId"));
  const fullMarks = Number(formData.get("fullMarks") ?? 100);
  const practicalMarks = Number(formData.get("practicalMarks") ?? 0);
  const passMarks = Number(formData.get("passMarks") ?? 40);
  const cs = await db.select().from(classSubjects).where(and(eq(classSubjects.classId, classId), eq(classSubjects.schoolId, schoolId)));
  let n = 0;
  for (const r of cs) {
    const exists = await db.select().from(examSubjects).where(and(eq(examSubjects.examId, examId), eq(examSubjects.classId, classId), eq(examSubjects.subjectId, r.subjectId), eq(examSubjects.schoolId, schoolId))).limit(1);
    if (exists.length === 0) {
      await db.insert(examSubjects).values({ examId, classId, subjectId: r.subjectId, fullMarks, practicalMarks, passMarks, schoolId });
      n++;
    }
  }
  await logAudit(user.id, "Bulk added exam subjects", "examSubject", undefined, `${n} subjects`);
  await flashTo(`/examinations?exam=${examId}`, `${n} subject(s) added with default marks.`);
}

export async function removeExamSubject(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const schoolId = await currentSchoolId();
  const id = Number(formData.get("id"));
  const examId = Number(formData.get("examId"));
  await db.delete(examSubjects).where(and(eq(examSubjects.id, id), eq(examSubjects.schoolId, schoolId)));
  await logAudit(user.id, "Removed exam subject", "examSubject", id);
  await flashTo(`/examinations?exam=${examId}`, "Subject removed.");
}

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim();
  return str ? str : null;
}

/* ----------------------------------- Page ----------------------------------- */

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const schoolId = await currentSchoolId();
  const isAdmin = user.role === "admin";
  const sp = await searchParams;

  const [allYears, allClasses] = await Promise.all([
    db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId)).orderBy(desc(academicYears.id)),
    db.select().from(classes).where(eq(classes.schoolId, schoolId)).orderBy(classes.sortOrder),
  ]);

  if (user.role === "student" || user.role === "parent") return <Routine user={user} allClasses={allClasses} schoolId={schoolId} />;

  const exams = await db
    .select({
      e: examinations,
      year: sql<string>`academic_years.name`,
      subjCount: sql<number>`(select count(*) from exam_subjects where exam_subjects.exam_id = ${examinations.id})::int`,
      classCount: sql<number>`(select count(distinct class_id) from exam_subjects where exam_subjects.exam_id = ${examinations.id})::int`,
    })
    .from(examinations)
    .innerJoin(academicYears, eq(academicYears.id, examinations.academicYearId))
    .where(eq(examinations.schoolId, schoolId))
    .orderBy(desc(examinations.id));

  const examId = sp.exam ? Number(sp.exam) : null;
  const cfgExam = examId ? exams.find((x) => x.e.id === examId) : null;

  let cfgData: { classId: number; className: string; subjects: any[] }[] = [];
  if (cfgExam) {
    const rows = await db
      .select({
        id: examSubjects.id,
        classId: examSubjects.classId,
        subjectId: examSubjects.subjectId,
        fullMarks: examSubjects.fullMarks,
        practicalMarks: examSubjects.practicalMarks,
        passMarks: examSubjects.passMarks,
        subjectName: subjects.name,
      })
      .from(examSubjects)
      .innerJoin(subjects, eq(subjects.id, examSubjects.subjectId))
      .where(and(eq(examSubjects.examId, cfgExam.e.id), eq(examSubjects.schoolId, schoolId)))
      .orderBy(examSubjects.classId);
    cfgData = allClasses
      .filter((c) => rows.some((r) => r.classId === c.id))
      .map((c) => ({ classId: c.id, className: c.name, subjects: rows.filter((r) => r.classId === c.id) }));
  }

  return (
    <>
      <PageHead title="Examinations" sub="Terminal exams, unit tests, internal and practical assessments">
        {isAdmin && (
          <FormModal title="New examination" icon="plus" label="New examination">
            <ExamForm years={allYears} today={todayStr()} />
          </FormModal>
        )}
      </PageHead>

      <div className="space-y-3.5">
        {exams.length === 0 && (
          <div className="card"><Empty icon="calendar" title="No examinations yet" sub={isAdmin ? "Create your first examination." : "Examination schedules will appear here."} /></div>
        )}
        {exams.map(({ e, year, subjCount, classCount }) => {
          const isCfg = cfgExam?.e.id === e.id;
          const upcoming = e.startDate && e.startDate >= todayStr();
          return (
            <div key={e.id} className={`card overflow-hidden ${isCfg ? "ring-2 ring-forest/40" : ""}`}>
              <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-forest text-white flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold uppercase leading-none">{e.startDate ? new Date(e.startDate + "T00:00:00").toLocaleDateString("en-GB", { month: "short" }) : "—"}</span>
                  <span className="text-base font-extrabold leading-tight">{e.startDate ? new Date(e.startDate + "T00:00:00").getDate() : "·"}</span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-bold text-ink flex items-center gap-2 flex-wrap">
                    {e.name}
                    {e.status === "published" ? <Badge tone="green">Published</Badge> : e.status === "completed" ? <Badge tone="blue">Completed</Badge> : upcoming ? <Badge tone="amber">Upcoming</Badge> : <Badge tone="gray">Scheduled</Badge>}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {e.examType} · {year} · {fmtDate(e.startDate)} – {fmtDate(e.endDate)} · {classCount} class{classCount === 1 ? "" : "es"} · {subjCount} subject entries
                  </div>
                </div>
                <div className="flex gap-2">
                  {isAdmin ? (
                    <>
                      <a href={`/examinations?exam=${e.id}`} className={`btn-sm ${isCfg ? "btn-primary" : "btn-ghost"}`}>
                        <Icon name="gear" className="w-3.5 h-3.5" /> Subjects & marks
                      </a>
                      <FormModal title={`Edit — ${e.name}`} btnClass="btn-ghost btn-sm" icon="edit" label="Edit">
                        <ExamForm years={allYears} exam={e} today={todayStr()} />
                      </FormModal>
                      <ConfirmButton action={deleteExam} icon="trash" label="Delete" className="btn-danger btn-sm" message={`Delete ${e.name}? Its subject settings and marks will be removed.`} confirmText="Delete" fields={[{ name: "id", value: String(e.id) }]} />
                    </>
                  ) : (
                    user.role === "teacher" && (
                      <LinkToMarks examId={e.id} />
                    )
                  )}
                </div>
              </div>

              {isCfg && isAdmin && (
                <div className="border-t border-line bg-forest-mist/40 px-5 py-4">
                  <h4 className="font-bold text-sm text-ink mb-3">Subjects & marks by class</h4>
                  <ExamConfig examId={e.id} allClasses={allClasses} data={cfgData} schoolId={schoolId} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function LinkToMarks({ examId }: { examId: number }) {
  return (
    <a href={`/marks?exam=${examId}`} className="btn-primary btn-sm">
      <Icon name="pen" className="w-3.5 h-3.5" /> Enter marks
    </a>
  );
}

async function ExamConfig({ examId, allClasses, data, schoolId }: { examId: number; allClasses: { id: number; name: string }[]; data: any[]; schoolId: number }) {
  const allSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId)).orderBy(subjects.name);
  const existingClassIds = new Set(data.map((d) => d.classId));
  const [csRows] = await Promise.all([
    db.select().from(classSubjects).where(eq(classSubjects.schoolId, schoolId)).orderBy(classSubjects.id),
  ]);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        {data.length === 0 ? (
          <Empty icon="book" title="No subjects configured yet" sub="Use the form to add subjects for a class, or bulk-add the whole class." />
        ) : (
          <div className="space-y-4">
            {data.map((d) => (
              <div key={d.classId}>
                <div className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">{d.className}</div>
                <div className="overflow-x-auto"><table className="tbl">
                  <thead>
                    <tr><th>Subject</th><th>Full</th><th>Theory</th><th>Practical</th><th>Pass</th><th className="text-right">Remove</th></tr>
                  </thead>
                  <tbody>
                    {d.subjects.map((srow: any) => (
                      <tr key={srow.id}>
                        <td className="font-semibold">{srow.subjectName}</td>
                        <td>{srow.fullMarks}</td>
                        <td>{srow.fullMarks - srow.practicalMarks}</td>
                        <td>{srow.practicalMarks}</td>
                        <td>{srow.passMarks}</td>
                        <td className="text-right">
                          <ConfirmButton action={removeExamSubject} icon="x" title="Remove" className="btn-danger btn-sm" message={`Remove ${srow.subjectName} from this examination?`} confirmText="Remove" fields={[{ name: "id", value: String(srow.id) }, { name: "examId", value: String(examId) }]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="card p-4">
          <h5 className="font-bold text-xs text-ink mb-3">Add subject to a class</h5>
          <form action={saveExamSubject} className="space-y-2.5">
            <input type="hidden" name="examId" value={examId} />
            <Field label="Class">
              <select name="classId" className="inp" required>
                <option value="">Select…</option>
                {allClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <select name="subjectId" className="inp" required>
                <option value="">Select…</option>
                {allSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Full"><input name="fullMarks" type="number" min="1" max="1000" defaultValue={100} className="inp" required /></Field>
              <Field label="Practical"><input name="practicalMarks" type="number" min="0" defaultValue={0} className="inp" /></Field>
              <Field label="Pass"><input name="passMarks" type="number" min="1" defaultValue={40} className="inp" /></Field>
            </div>
            <button className="btn-primary w-full"><Icon name="plus" className="w-4 h-4" /> Add</button>
          </form>
        </div>
        <div className="card p-4">
          <h5 className="font-bold text-xs text-ink mb-3">Bulk-add class subjects</h5>
          <form action={bulkAddExamSubjects} className="space-y-2.5">
            <input type="hidden" name="examId" value={examId} />
            <Field label="Class (uses its assigned subjects)">
              <select name="classId" className="inp" required>
                <option value="">Select…</option>
                {allClasses.filter((c) => csRows.some((r) => r.classId === c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Full"><input name="fullMarks" type="number" min="1" max="1000" defaultValue={100} className="inp" /></Field>
              <Field label="Practical"><input name="practicalMarks" type="number" min="0" defaultValue={10} className="inp" /></Field>
              <Field label="Pass"><input name="passMarks" type="number" min="1" defaultValue={40} className="inp" /></Field>
            </div>
            <button className="btn-ghost w-full">Add all assigned subjects</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ExamForm({ years, exam, today }: { years: { id: number; name: string }[]; exam?: any; today: string }) {
  return (
    <form action={saveExam} className="space-y-4">
      {exam && <input type="hidden" name="id" value={exam.id} />}
      <Field label="Examination name *">
        <input name="name" defaultValue={exam?.name ?? ""} required placeholder="e.g. Second Terminal Examination" className="inp" />
      </Field>
      <Field label="Type">
        <select name="examType" defaultValue={exam?.examType ?? "First Terminal Examination"} className="inp">
          {EXAM_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Academic year *">
        <select name="academicYearId" defaultValue={exam?.academicYearId ?? ""} className="inp" required>
          <option value="">Select…</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input name="startDate" type="date" defaultValue={exam?.startDate ?? today} className="inp" />
        </Field>
        <Field label="End date">
          <input name="endDate" type="date" defaultValue={exam?.endDate ?? addDays(new Date(), 6)} className="inp" />
        </Field>
      </div>
      <Field label="Status">
        <select name="status" defaultValue={exam?.status ?? "scheduled"} className="inp">
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed (marks open)</option>
          <option value="published">Published (locked)</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <ModalCancel />
        <button className="btn-primary"><Icon name="check" className="w-4 h-4" /> {exam ? "Save changes" : "Create examination"}</button>
      </div>
    </form>
  );
}

/* --------------------------- Student / parent routine ------------------------- */

async function Routine({ user, allClasses, schoolId }: { user: any; allClasses: any[]; schoolId: number }) {
  let classId: number | null = null;
  if (user.role === "student") {
    const [enr] = await db.select().from(enrollments).where(and(eq(enrollments.studentId, user.studentId), eq(enrollments.status, "active"), eq(enrollments.schoolId, schoolId))).limit(1);
    classId = enr?.classId ?? null;
  } else {
    const children = await db.select().from(parentChildren).where(and(eq(parentChildren.userId, user.id), eq(parentChildren.schoolId, schoolId)));
    if (children.length > 0) {
      const [enr] = await db.select().from(enrollments).where(and(eq(enrollments.studentId, children[0].studentId), eq(enrollments.status, "active"), eq(enrollments.schoolId, schoolId))).limit(1);
      classId = enr?.classId ?? null;
    }
  }

  const exams = await db
    .select({
      e: examinations,
      year: sql<string>`academic_years.name`,
    })
    .from(examinations)
    .innerJoin(academicYears, eq(academicYears.id, examinations.academicYearId))
    .where(eq(examinations.schoolId, schoolId))
    .orderBy(examinations.startDate)
    .limit(12);

  let subjectsOf: any[] = [];
  if (classId) {
    subjectsOf = await db
      .select({ examId: examSubjects.examId, subjectName: subjects.name, fullMarks: examSubjects.fullMarks })
      .from(examSubjects)
      .innerJoin(subjects, eq(subjects.id, examSubjects.subjectId))
      .where(and(eq(examSubjects.classId, classId), eq(examSubjects.schoolId, schoolId)))
      .orderBy(subjects.name);
  }

  return (
    <>
      <PageHead title="Examination Routine" sub={classId ? allClasses.find((c) => c.id === classId)?.name ?? "" : "No class found"} />
      <div className="space-y-3.5">
        {exams.length === 0 && <div className="card"><Empty icon="calendar" title="No examinations scheduled" /></div>}
        {exams.map(({ e, year }) => {
          const subs = subjectsOf.filter((s) => s.examId === e.id);
          return (
            <div key={e.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <div className="font-bold text-ink">{e.name}</div>
                  <div className="text-xs text-muted mt-0.5">{e.examType} · {year} · {fmtDate(e.startDate)} – {fmtDate(e.endDate)}</div>
                </div>
                {e.startDate && e.startDate >= todayStr() ? <Badge tone="amber">Upcoming</Badge> : <Badge tone="gray">Past</Badge>}
              </div>
              {subs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {subs.map((s) => (
                    <span key={s.examId + s.subjectName} className="badge bg-forest-mist text-inksoft border border-linesoft">{s.subjectName} <span className="text-muted">(full {s.fullMarks})</span></span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
