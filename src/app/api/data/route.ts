
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  parentChildren,
  students,
  teachers,
  classes,
  sections,
  subjects,
  academicYears,
  classSubjects,
  enrollments,
  attendance,
  examinations,
  examSubjects,
  marks,
  notes,
  notices,
  gradingScale,
  settings,
  auditLogs,
  sessions,
  feeCategories,
  feeStructures,
  feeInvoices,
  feeInvoiceItems,
  feePayments,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";
import { computeClassResults, getScale } from "@/lib/grading";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");
}

async function csvResponse(content: string, filename: string) {
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const schoolId = await currentSchoolId();

  const url = new URL(req.url);
  const op = url.searchParams.get("op");
  const type = url.searchParams.get("type") ?? "students";

  if (op === "backup") {
    const tables = [
      ["academic_years", academicYears],
      ["classes", classes],
      ["sections", sections],
      ["subjects", subjects],
      ["students", students],
      ["teachers", teachers],
      ["users", users],
      ["parent_children", parentChildren],
      ["class_subjects", classSubjects],
      ["enrollments", enrollments],
      ["attendance", attendance],
      ["examinations", examinations],
      ["exam_subjects", examSubjects],
      ["marks", marks],
      ["notes", notes],
      ["notices", notices],
      ["grading_scale", gradingScale],
      ["settings", settings],
      ["audit_logs", auditLogs],
      ["fee_categories", feeCategories],
      ["fee_structures", feeStructures],
      ["fee_invoices", feeInvoices],
      ["fee_invoice_items", feeInvoiceItems],
      ["fee_payments", feePayments],
    ] as const;

    const out: Record<string, unknown[]> = {};

    for (const [name, table] of tables) {
      out[name] = name === "settings"
        ? await db.select().from(table as any)
        : await db.select().from(table as any).where(eq((table as any).schoolId, schoolId));
    }

    return new Response(
      JSON.stringify(
        {
          app: "sjjs-sms",
          exportedAt: new Date().toISOString(),
          data: out,
        },
        null,
        1
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="sjjs-backup-${new Date().toISOString().slice(0, 10)}.json"`,
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  if (op !== "export") {
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }

  if (type === "students") {
    const rows = await db
      .select({
        name: students.name,
        adm: students.admissionNo,
        dob: students.dob,
        gender: students.gender,
        cls: classes.name,
        sec: sections.name,
        roll: enrollments.rollNo,
        father: students.fatherName,
        contact: students.contact,
        address: students.address,
      })
      .from(students)
      .leftJoin(
        enrollments,
        and(
          eq(enrollments.studentId, students.id),
          eq(enrollments.status, "active"),
          eq(enrollments.schoolId, schoolId)
        )
      )
      .leftJoin(classes, and(eq(classes.id, enrollments.classId), eq(classes.schoolId, schoolId)))
      .leftJoin(sections, and(eq(sections.id, enrollments.sectionId), eq(sections.schoolId, schoolId)))
      .where(and(sql`${students.deletedAt} is null`, eq(students.schoolId, schoolId)))
      .orderBy(students.name);

    return csvResponse(
      toCsv(
        [
          "Name",
          "Admission No",
          "DOB",
          "Gender",
          "Class",
          "Section",
          "Roll",
          "Father",
          "Contact",
          "Address",
        ],
        rows.map((r) => [
          r.name,
          r.adm,
          r.dob,
          r.gender,
          r.cls,
          r.sec,
          r.roll,
          r.father,
          r.contact,
          r.address,
        ])
      ),
      "students.csv"
    );
  }

  if (type === "teachers") {
    const rows = await db.select().from(teachers)
      .where(eq(teachers.schoolId, schoolId))
      .orderBy(teachers.name);

    return csvResponse(
      toCsv(
        [
          "Name",
          "Employee No",
          "Gender",
          "Phone",
          "Email",
          "Qualification",
          "Joined",
          "Status",
        ],
        rows.map((r) => [
          r.name,
          r.employeeNo,
          r.gender,
          r.phone,
          r.email,
          r.qualification,
          r.joinDate,
          r.status,
        ])
      ),
      "teachers.csv"
    );
  }

  if (type === "classes") {
    const rows = await db
      .select({
        name: classes.name,
        level: classes.level,
        sections: sql<number>`(
          select count(*)
          from sections
          where sections.class_id = ${classes.id}
          and sections.school_id = ${schoolId}
        )::int`,
        students: sql<number>`(
          select count(*)
          from enrollments
          where enrollments.class_id = ${classes.id}
          and enrollments.school_id = ${schoolId}
          and enrollments.status = 'active'
        )::int`,
      })
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(classes.sortOrder);

    return csvResponse(
      toCsv(
        ["Class", "Level", "Sections", "Active Students"],
        rows.map((r) => [
          r.name,
          r.level,
          r.sections,
          r.students,
        ])
      ),
      "classes.csv"
    );
  }

  if (type === "attendance") {
    const classId = url.searchParams.get("classId");
    const sectionId = url.searchParams.get("sectionId");
    const studentId = url.searchParams.get("student");

    let where: any = sql`true`;

    if (studentId) {
      const parsedStudentId = Number(studentId);

      if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
        return NextResponse.json(
          { error: "Invalid student ID" },
          { status: 400 }
        );
      }

      where = sql`${attendance.studentId} = ${parsedStudentId}`;
    } else if (classId) {
      const parsedClassId = Number(classId);
      const parsedSectionId = sectionId ? Number(sectionId) : null;

      if (!Number.isInteger(parsedClassId) || parsedClassId <= 0) {
        return NextResponse.json(
          { error: "Invalid class ID" },
          { status: 400 }
        );
      }

      if (
        parsedSectionId !== null &&
        (!Number.isInteger(parsedSectionId) || parsedSectionId <= 0)
      ) {
        return NextResponse.json(
          { error: "Invalid section ID" },
          { status: 400 }
        );
      }

      where = sql`
        ${attendance.studentId} in (
          select student_id
          from enrollments
          where class_id = ${parsedClassId}
          and school_id = ${schoolId}
          and status = 'active'
          ${
            parsedSectionId
              ? sql`and section_id = ${parsedSectionId}`
              : sql``
          }
        )
      `;
    }

    const rows = await db
      .select({
        student: students.name,
        date: attendance.attDate,
        status: attendance.status,
      })
      .from(attendance)
      .innerJoin(students, and(eq(students.id, attendance.studentId), eq(students.schoolId, schoolId)))
      .where(and(where, eq(attendance.schoolId, schoolId)))
      .orderBy(attendance.attDate)
      .limit(20000);

    return csvResponse(
      toCsv(
        ["Student", "Date", "Status"],
        rows.map((r) => [r.student, r.date, r.status])
      ),
      "attendance.csv"
    );
  }

  if (type === "results") {
    const scale = await getScale();

    const [exam] = await db
      .select()
      .from(examinations)
      .where(and(eq(examinations.status, "published"), eq(examinations.schoolId, schoolId)))
      .orderBy(sql`coalesce(end_date, start_date) desc`)
      .limit(1);

    if (!exam) {
      return csvResponse(
        toCsv(["No results published"], []),
        "results.csv"
      );
    }

    const clsList = await db
      .select()
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(classes.sortOrder);

    const out: unknown[][] = [];

    for (const c of clsList) {
      const res = await computeClassResults(exam.id, c.id, scale);

      if (res.length === 0) continue;

      const subjects = Array.from(
        new Set(res.flatMap((x) => x.rows.map((y) => y.subjectName)))
      );

      out.push([
        c.name,
        exam.name,
        ...subjects.map((s) => `${s} (total)`),
        "Overall %",
        "GPA",
        "Result",
      ]);

      for (const r of res) {
        out.push([
          c.name,
          exam.name,
          ...subjects.map(
            (s) => r.rows.find((y) => y.subjectName === s)?.total ?? ""
          ),
          r.pct ?? "",
          r.gpaDisplay,
          r.result,
        ]);
      }

      out.push([]);
    }

    return csvResponse(
      out.map((row) => row.map(csvEscape).join(",")).join("\n"),
      "results.csv"
    );
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const schoolId = await currentSchoolId();

  // Restore swaps global settings/sequences and every row in the backup, so a
  // per-school restore cannot be made safe. Only the original school may restore.
  if (schoolId !== 1) {
    return NextResponse.json(
      { error: "Restore is only supported for the default school (school 1)." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const url = new URL(req.url);

  if (url.searchParams.get("op") !== "restore") {
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }

  const fd = await req.formData();
  const file = fd.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No backup file provided." },
      { status: 400 }
    );
  }

  let payload: any;

  try {
    payload = JSON.parse(await file.text());
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON backup file." },
      { status: 400 }
    );
  }

  if (payload?.app !== "sjjs-sms" || !payload.data) {
    return NextResponse.json(
      { error: "This file is not a SJJS SMS backup." },
      { status: 400 }
    );
  }

  // Session tokens are deliberately not backed up; invalidate all current sessions on restore.
  const deleteOrder: [string, any][] = [
    ["fee_payments", feePayments],
    ["fee_invoice_items", feeInvoiceItems],
    ["fee_invoices", feeInvoices],
    ["fee_structures", feeStructures],
    ["fee_categories", feeCategories],
    ["marks", marks],
    ["exam_subjects", examSubjects],
    ["attendance", attendance],
    ["enrollments", enrollments],
    ["class_subjects", classSubjects],
    ["parent_children", parentChildren],
    ["notes", notes],
    ["notices", notices],
    ["examinations", examinations],
    ["grading_scale", gradingScale],
    ["settings", settings],
    ["audit_logs", auditLogs],
    ["users", users],
    ["teachers", teachers],
    ["students", students],
    ["subjects", subjects],
    ["sections", sections],
    ["classes", classes],
    ["academic_years", academicYears],
  ];

  const insertOrder: [string, any][] = [
    ["academic_years", academicYears],
    ["classes", classes],
    ["sections", sections],
    ["subjects", subjects],
    ["students", students],
    ["teachers", teachers],
    ["users", users],
    ["parent_children", parentChildren],
    ["class_subjects", classSubjects],
    ["enrollments", enrollments],
    ["attendance", attendance],
    ["examinations", examinations],
    ["exam_subjects", examSubjects],
    ["marks", marks],
    ["notes", notes],
    ["notices", notices],
    ["grading_scale", gradingScale],
    ["settings", settings],
    ["audit_logs", auditLogs],
    ["fee_categories", feeCategories],
    ["fee_structures", feeStructures],
    ["fee_invoices", feeInvoices],
    ["fee_invoice_items", feeInvoiceItems],
    ["fee_payments", feePayments],
  ];

  const operations: any[] = [db.delete(sessions)];
  const present = new Set<string>();
  let tables = 0;

  for (const [name, table] of deleteOrder) {
    if (Array.isArray(payload.data[name])) {
      operations.push(db.delete(table));
      present.add(name);
      tables++;
    }
  }

  for (const [name, table] of insertOrder) {
    const rows = payload.data[name];
    if (present.has(name) && Array.isArray(rows) && rows.length > 0) {
      operations.push(db.insert(table).values(rows as any));
    }
  }

  // Restore serial counters after explicit IDs are inserted from the backup.
  const sequenceTables = [
    "academic_years", "classes", "sections", "subjects", "students", "teachers",
    "users", "parent_children", "class_subjects", "enrollments", "attendance",
    "examinations", "exam_subjects", "marks", "notes", "notices", "grading_scale",
    "audit_logs", "fee_categories", "fee_structures", "fee_invoices",
    "fee_invoice_items", "fee_payments", "sessions",
  ];
  for (const tableName of sequenceTables) {
    operations.push(db.execute(sql.raw(
      `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${tableName}"`
    )));
  }

  // Neon HTTP batch executes the statements as one database transaction.
  await db.batch(operations as any);

  return NextResponse.json(
    { ok: true, tables },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
