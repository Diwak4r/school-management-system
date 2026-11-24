
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/db";
import { notes, academicYears, classes, sections, subjects, classSubjects, teachers } from "@/db/schema";
import { getSessionUser, logAudit } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json(
      { error: "You are not allowed to upload files." },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  const schoolId = await currentSchoolId();

  const fd = await req.formData();
  const file = fd.get("file");
  const title = String(fd.get("title") ?? "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 }
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File exceeds 15 MB." },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name).toLowerCase();

  if (!ALLOWED.includes(ext)) {
    return NextResponse.json(
      {
        error: `File type ${ext || "unknown"} is not allowed. Allowed: ${ALLOWED.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const parseOptionalId = (value: FormDataEntryValue | null): number | null => {
    if (value === null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
  };

  const classId = parseOptionalId(fd.get("classId"));
  const sectionId = parseOptionalId(fd.get("sectionId"));
  const subjectId = parseOptionalId(fd.get("subjectId"));

  if ([classId, sectionId, subjectId].some((value) => Number.isNaN(value))) {
    return NextResponse.json({ error: "Invalid class, section, or subject." }, { status: 400 });
  }

  if ((sectionId || subjectId) && !classId) {
    return NextResponse.json({ error: "Select a class before selecting a section or subject." }, { status: 400 });
  }

  if (classId) {
    const [classRow] = await db.select({ id: classes.id }).from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId))).limit(1);
    if (!classRow) return NextResponse.json({ error: "Selected class does not exist." }, { status: 400 });
  }

  if (sectionId) {
    const [sectionRow] = await db.select({ id: sections.id }).from(sections)
      .where(and(eq(sections.id, sectionId), eq(sections.classId, classId!), eq(sections.schoolId, schoolId))).limit(1);
    if (!sectionRow) return NextResponse.json({ error: "Selected section does not belong to that class." }, { status: 400 });
  }

  if (subjectId) {
    const [subjectRow] = await db.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId))).limit(1);
    if (!subjectRow) return NextResponse.json({ error: "Selected subject does not exist." }, { status: 400 });
  }

  if (user.role === "teacher") {
    if (!user.teacherId || !classId) {
      return NextResponse.json({ error: "Select one of your assigned classes." }, { status: 403 });
    }
    const [teacherRow] = await db.select({ id: teachers.id }).from(teachers)
      .where(and(eq(teachers.id, user.teacherId), eq(teachers.schoolId, schoolId))).limit(1);
    if (!teacherRow) {
      return NextResponse.json({ error: "Your account does not belong to this school." }, { status: 403 });
    }
    const assignmentConditions = [
      eq(classSubjects.teacherId, user.teacherId),
      eq(classSubjects.classId, classId),
      eq(classSubjects.schoolId, schoolId),
    ];
    if (subjectId) assignmentConditions.push(eq(classSubjects.subjectId, subjectId));
    const [assignment] = await db.select({ id: classSubjects.id }).from(classSubjects)
      .where(and(...assignmentConditions)).limit(1);
    if (!assignment) {
      return NextResponse.json({ error: "You are not assigned to this class/subject." }, { status: 403 });
    }
  }

  const [year] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.status, "active"), eq(academicYears.schoolId, schoolId)))
    .limit(1);

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(dir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buf);

  let row: { id: number };
  try {
    [row] = await db
      .insert(notes)
    .values({
      schoolId,
      title,
      classId,
      sectionId,
      subjectId,
      type: "file",
      url: `/uploads/${safeName}`,
      fileName: file.name,
      academicYearId: year?.id ?? null,
      uploadedById: user.id,
    })
      .returning({ id: notes.id });
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }

  await logAudit(
    user.id,
    "Uploaded file note",
    "note",
    row.id,
    title
  );

  return NextResponse.json(
    {
      ok: true,
      title,
      url: `/uploads/${safeName}`,
      noteId: row.id,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
