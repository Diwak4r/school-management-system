import StudentClassSectionFields from "@/components/student-class-section-fields";import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, sql, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { students, enrollments, classes, sections, academicYears, attendance } from "@/db/schema";
import { requireUser, requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { PageHead, Badge, FormModal, ModalCancel, Field, ConfirmButton, Icon, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

/* ---------------------------------- Actions --------------------------------- */

export async function saveStudent(formData: FormData) {
  "use server";

  const user = await requireRole("admin");

  const id = formData.get("id")
    ? Number(formData.get("id"))
    : null;

  const name = String(formData.get("name") ?? "").trim();
  const admissionNo = String(formData.get("admissionNo") ?? "").trim();

  if (!name) await flashTo("/students", "Student name is required.", true);
  if (!admissionNo) await flashTo("/students", "Admission number is required.", true);

  // Check duplicate admission numbers.
  const dup = await db
    .select({ id: students.id })
    .from(students)
    .where(
      id
        ? and(
            eq(students.admissionNo, admissionNo),
            sql`${students.id} != ${id}`
          )
        : eq(students.admissionNo, admissionNo)
    )
    .limit(1);

  if (dup.length > 0) {
    await flashTo("/students", `Admission number ${admissionNo} is already in use.`, true);
  }

  // Read enrollment information.
  const classId = n(formData.get("classId"));
  const sectionId = n(formData.get("sectionId"));
  const rollNo = n(formData.get("rollNo"));

  let academicYearId: number | null = null;

  // Validate enrollment BEFORE saving student details.
  if (classId !== null) {
    if (!Number.isInteger(classId) || classId <= 0) {
      await flashTo("/students", "Invalid class selected.", true);
    }

    const [classRow] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);

    if (!classRow) {
      await flashTo("/students", "Selected class does not exist.", true);
    }

    const [year] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.status, "active"))
      .limit(1);

    if (!year) {
      await flashTo("/students", "No active academic year. Please activate 2083/2084 first.", true);
    }

    academicYearId = year.id;

    // Confirm that the selected section belongs to the selected class.
    if (sectionId !== null) {
      if (!Number.isInteger(sectionId) || sectionId <= 0) {
        await flashTo("/students", "Invalid section selected.", true);
      }

      const [sectionRow] = await db
        .select()
        .from(sections)
        .where(
          and(
            eq(sections.id, sectionId),
            eq(sections.classId, classId)
          )
        )
        .limit(1);

      if (!sectionRow) {
        await flashTo("/students", "The selected section does not belong to this class.", true);
      }
    }

    // Validate roll number.
    if (rollNo !== null) {
      if (!Number.isInteger(rollNo) || rollNo <= 0) {
        await flashTo("/students", "Roll number must be a positive whole number.", true);
      }

      const rollConditions = [
        eq(enrollments.academicYearId, academicYearId),
        eq(enrollments.classId, classId),
        eq(enrollments.rollNo, rollNo),
        eq(enrollments.status, "active"),
        sectionId === null
          ? isNull(enrollments.sectionId)
          : eq(enrollments.sectionId, sectionId),
      ];

      // Ignore this student when editing their existing enrollment.
      if (id !== null) {
        rollConditions.push(
          sql`${enrollments.studentId} != ${id}`
        );
      }

      const duplicateRoll = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(and(...rollConditions))
        .limit(1);

      if (duplicateRoll.length > 0) {
        await flashTo(
          "/students",
          `Roll number ${rollNo} is already assigned in this class and section for ${year.name}.`,
          true
        );
      }
    }
  } else if (sectionId !== null || rollNo !== null) {
    await flashTo("/students", "Select a class before entering a section or roll number.", true);
  }

  // Prepare student personal information.
  const data = {
    name,
    admissionNo,
    dob: s(formData.get("dob")),
    gender: s(formData.get("gender")),
    address: s(formData.get("address")),
    contact: s(formData.get("contact")),
    email: s(formData.get("email")),
    nationality: s(formData.get("nationality")) ?? "Nepali",
    bloodGroup: s(formData.get("bloodGroup")),
    fatherName: s(formData.get("fatherName")),
    motherName: s(formData.get("motherName")),
    guardianName: s(formData.get("guardianName")),
    guardianContact: s(formData.get("guardianContact")),
    guardianOccupation: s(formData.get("guardianOccupation")),
    previousSchool: s(formData.get("previousSchool")),
  };

  // Save student information.
  let studentId = id;

  if (id !== null) {
    await db.update(students).set(data).where(eq(students.id, id));
  } else {
    const [row] = await db
      .insert(students)
      .values(data)
      .returning({ id: students.id });

    studentId = row.id;
  }

  // Save enrollment for the active academic year.
  if (classId !== null && academicYearId !== null) {
    const existing = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId!),
          eq(enrollments.academicYearId, academicYearId),
          eq(enrollments.status, "active")
        )
      )
      .limit(1);

    const enrollmentData = {
      classId,
      sectionId,
      rollNo,
    };

    if (existing.length > 0) {
      await db
        .update(enrollments)
        .set(enrollmentData)
        .where(eq(enrollments.id, existing[0].id));
    } else {
      await db.insert(enrollments).values({
        studentId: studentId!,
        ...enrollmentData,
        academicYearId,
        admissionDate:
          s(formData.get("admissionDate")) ??
          new Date().toISOString().slice(0, 10),
        status: "active",
      });
    }
  }

  await logAudit(
    user.id,
    id !== null ? "Updated student" : "Added student",
    "student",
    studentId ?? undefined,
    name
  );

  await flashTo(
    "/students",
    id !== null
      ? "Student record updated."
      : `${name} admitted successfully.`
  );
}

export async function deleteStudent(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  await db.update(students).set({ deletedAt: new Date() }).where(eq(students.id, id));
  await logAudit(user.id, "Removed student", "student", id, row?.name);
  await flashTo("/students", "Student removed (soft delete â€” history preserved).");
}

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim();
  return str ? str : null;
}
function n(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim();
  return str === "" || isNaN(Number(str)) ? null : Number(str);
}

/* ----------------------------------- Page ----------------------------------- */

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (user.role === "student") redirect(`/students/${user.studentId}`);
  if (user.role === "parent") redirect("/dashboard");
  const isAdmin = user.role === "admin";

  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const classId = sp.classId ? Number(sp.classId) : null;
  const sectionId = sp.sectionId ? Number(sp.sectionId) : null;
  const gender = sp.gender ? String(sp.gender) : null;

  const [allClasses, allSections, yearRow, base] = await (async () => {
    const [allClasses, allSections, yearRow] = await Promise.all([
      db.select().from(classes).orderBy(classes.sortOrder),
      db.select().from(sections),
      db.select().from(academicYears).where(eq(academicYears.status, "active")).limit(1),
    ]);
    const year = yearRow[0]?.id ?? null;
    const base = await db
      .select({
        student: students,
        className: classes.name,
        classId: classes.id,
        section: sections.name,
        sectionId: sections.id,
        rollNo: enrollments.rollNo,
      })
      .from(students)
      .leftJoin(enrollments, and(eq(enrollments.studentId, students.id), eq(enrollments.status, "active"), eq(enrollments.academicYearId, year)))
      .leftJoin(classes, eq(classes.id, enrollments.classId))
      .leftJoin(sections, eq(sections.id, enrollments.sectionId))
      .where(isNull(students.deletedAt))
      .orderBy(students.name);
    return [allClasses, allSections, yearRow, base];
  })();
  const activeYear = yearRow[0];

  let rows = base.filter((r) => {
    if (q && !(r.student.name.toLowerCase().includes(q.toLowerCase()) || r.student.admissionNo.toLowerCase().includes(q.toLowerCase()))) return false;
    if (classId && r.classId !== classId) return false;
    if (sectionId && r.sectionId !== sectionId) return false;
    if (gender && r.student.gender !== gender) return false;
    return true;
  });
  rows = rows.slice(0, 300);

  const ids = rows.map((r) => r.student.id);
  const attRows =
    ids.length > 0
      ? await db
          .select({ studentId: attendance.studentId, status: attendance.status, c: sql<number>`count(*)::int` })
          .from(attendance)
          .where(inArray(attendance.studentId, ids))
          .groupBy(attendance.studentId, attendance.status)
      : [];
  const attMap = new Map<number, { p: number; t: number }>();
  for (const a of attRows) {
    const cur = attMap.get(a.studentId) ?? { p: 0, t: 0 };
    cur.t += a.c;
    if (a.status === "P" || a.status === "L") cur.p += a.c;
    attMap.set(a.studentId, cur);
  }

  return (
    <>
      <PageHead title="Students" sub={`${rows.length} students Â· Academic year ${activeYear?.name ?? "â€”"}`}>
        {isAdmin && (
          <FormModal title="Admit new student" icon="plus" label="Add student" wide>
            <StudentForm classes={allClasses} sections={allSections} />
          </FormModal>
        )}
      </PageHead>

      <form className="card p-3.5 mb-4 grid grid-cols-2 md:grid-cols-5 gap-2.5 no-print">
        <div className="relative col-span-2 md:col-span-2">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search name or admission noâ€¦" className="inp pl-9" />
        </div>
        <select name="classId" defaultValue={classId ?? ""} className="inp">
          <option value="">All classes</option>
          {allClasses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="sectionId" defaultValue={sectionId ?? ""} className="inp">
          <option value="">All sections</option>
          {allSections.filter((sc) => !classId || sc.classId === classId).map((sc) => (
            <option key={sc.id} value={sc.id}>{sc.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select name="gender" defaultValue={gender ?? ""} className="inp flex-1">
            <option value="">Gender</option>
            <option>Female</option>
            <option>Male</option>
          </select>
          <button className="btn-primary shrink-0">Filter</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon="cap" title="No students found" sub={q ? `Nothing matches â€œ${q}â€. Try a different search.` : "Add your first student to get started."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[860px]">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Adm. No.</th>
                  <th>Class â€“ Sec</th>
                  <th>Roll</th>
                  <th>Father</th>
                  <th>Attendance</th>
                  <th>Status</th>
                  {isAdmin && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const att = attMap.get(r.student.id);
                  const pct = att && att.t > 0 ? Math.round((att.p / att.t) * 100) : null;
                  return (
                    <tr key={r.student.id}>
                      <td>
                        <Link href={`/students/${r.student.id}`} className="flex items-center gap-2.5 group">
                          <span className="w-8 h-8 rounded-full bg-forest-soft text-forest font-bold text-xs flex items-center justify-center shrink-0">{r.student.name[0]}</span>
                          <span className="font-semibold group-hover:text-forest transition-colors">{r.student.name}</span>
                        </Link>
                      </td>
                      <td className="text-inksoft font-mono text-xs">{r.student.admissionNo}</td>
                      <td>{r.className ? `${r.className} â€“ ${r.section}` : <span className="text-muted">Not enrolled</span>}</td>
                      <td>{r.rollNo ?? "â€”"}</td>
                      <td className="text-inksoft">{r.student.fatherName ?? "â€”"}</td>
                      <td>
                        {pct == null ? <span className="text-muted">â€”</span> : <span className={`font-bold ${pct >= 75 ? "text-forest" : "text-danger"}`}>{pct}%</span>}
                      </td>
                      <td>{r.className ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Unassigned</Badge>}</td>
                      {isAdmin && (
                        <td className="text-right whitespace-nowrap">
                          <FormModal title={`Edit â€” ${r.student.name}`} btnClass="btn-ghost btn-sm" icon="edit" label="Edit" wide>
                            <StudentForm classes={allClasses} sections={allSections} student={r.student} classId={r.classId} sectionId={r.sectionId} rollNo={r.rollNo} />
                          </FormModal>
                          <span className="inline-block w-1" />
                          <ConfirmButton
                            action={deleteStudent}
                            icon="trash"
                            title="Remove"
                            message={`Remove ${r.student.name} from active records? The record will be soft-deleted and academic history preserved.`}
                            confirmText="Remove"
                            fields={[{ name: "id", value: String(r.student.id) }]}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------- Student form ------------------------------ */

export function StudentForm({
  classes,
  sections,
  student,
  classId,
  sectionId,
  rollNo,
}: {
  classes: { id: number; name: string }[];
  sections: { id: number; classId: number; name: string }[];
  student?: any;
  classId?: number | null;
  sectionId?: number | null;
  rollNo?: number | null;
}) {
  return (
    <form action={saveStudent} className="grid grid-cols-2 gap-3.5">
      {student && <input type="hidden" name="id" value={student.id} />}
      <Field label="Full name *" className="col-span-2">
        <input name="name" defaultValue={student?.name ?? ""} required className="inp" />
      </Field>
      <Field label="Admission no. *">
        <input name="admissionNo" defaultValue={student?.admissionNo ?? ""} required className="inp font-mono" />
      </Field>
      <Field label="Date of birth">
        <input name="dob" type="date" defaultValue={student?.dob ?? ""} className="inp" />
      </Field>
      <Field label="Gender">
        <select name="gender" defaultValue={student?.gender ?? ""} className="inp">
          <option value="">â€”</option>
          <option>Female</option>
          <option>Male</option>
        </select>
      </Field>
      <Field label="Contact number">
        <input name="contact" defaultValue={student?.contact ?? ""} className="inp" />
      </Field>
      <StudentClassSectionFields
  classes={classes}
  sections={sections}
  defaultClassId={classId}
  defaultSectionId={sectionId}
/>
      <Field label="Roll no.">
        <input name="rollNo" type="number" min="1" defaultValue={rollNo ?? ""} className="inp" />
      </Field>
      <Field label="Admission date">
        <input name="admissionDate" type="date" defaultValue={student?.admissionDate ?? new Date().toISOString().slice(0, 10)} className="inp" />
      </Field>
      <Field label="Blood group">
        <select name="bloodGroup" defaultValue={student?.bloodGroup ?? ""} className="inp">
          <option value="">â€”</option>
          {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>
      <Field label="Address" className="col-span-2">
        <input name="address" defaultValue={student?.address ?? ""} className="inp" placeholder="Ward, Municipality, District" />
      </Field>
      <Field label="Father's name">
        <input name="fatherName" defaultValue={student?.fatherName ?? ""} className="inp" />
      </Field>
      <Field label="Mother's name">
        <input name="motherName" defaultValue={student?.motherName ?? ""} className="inp" />
      </Field>
      <Field label="Guardian name">
        <input name="guardianName" defaultValue={student?.guardianName ?? student?.fatherName ?? ""} className="inp" />
      </Field>
      <Field label="Guardian contact">
        <input name="guardianContact" defaultValue={student?.guardianContact ?? ""} className="inp" />
      </Field>
      <Field label="Guardian occupation">
        <input name="guardianOccupation" defaultValue={student?.guardianOccupation ?? ""} className="inp" />
      </Field>
      <Field label="Previous school" className="col-span-2">
        <input name="previousSchool" defaultValue={student?.previousSchool ?? ""} className="inp" />
      </Field>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <ModalCancel />
        <button type="submit" className="btn-primary">
          <Icon name="check" className="w-4 h-4" /> Save student
        </button>
      </div>
    </form>
  );
}
