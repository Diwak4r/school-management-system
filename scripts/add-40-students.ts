import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as S from "../src/db/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

const students = [
  ["Aarav Kumar Yadav", "Male"],
  ["Sita Kumari Shah", "Female"],
  ["Rohan Kumar Mahato", "Male"],
  ["Priya Kumari Jha", "Female"],
  ["Aashish Kumar Singh", "Male"],
  ["Rojina Kumari Yadav", "Female"],
  ["Bikash Kumar Jha", "Male"],
  ["Anita Kumari Mahato", "Female"],
  ["Suman Kumar Sharma", "Male"],
  ["Mina Kumari Thakur", "Female"],
  ["Nabin Kumar Yadav", "Male"],
  ["Laxmi Kumari Shah", "Female"],
  ["Kiran Kumar Mahato", "Male"],
  ["Gita Kumari Jha", "Female"],
  ["Deepak Kumar Singh", "Male"],
  ["Sarita Kumari Yadav", "Female"],
  ["Rajan Kumar Thapa", "Male"],
  ["Maya Kumari Mahato", "Female"],
  ["Amit Kumar Jha", "Male"],
  ["Bharti Kumari Shah", "Female"],
  ["Sunil Kumar Yadav", "Male"],
  ["Radha Kumari Singh", "Female"],
  ["Prakash Kumar Mahato", "Male"],
  ["Savita Kumari Jha", "Female"],
  ["Ramesh Kumar Thakur", "Male"],
  ["Asha Kumari Yadav", "Female"],
  ["Bimal Kumar Shah", "Male"],
  ["Muna Kumari Mahato", "Female"],
  ["Sanjay Kumar Jha", "Male"],
  ["Kamala Kumari Singh", "Female"],
  ["Hari Kumar Yadav", "Male"],
  ["Sujata Kumari Shah", "Female"],
  ["Dinesh Kumar Mahato", "Male"],
  ["Bina Kumari Jha", "Female"],
  ["Mukul Kumar Singh", "Male"],
  ["Rima Kumari Yadav", "Female"],
  ["Jitendra Kumar Shah", "Male"],
  ["Kanta Kumari Mahato", "Female"],
  ["Niraj Kumar Jha", "Male"],
  ["Maya Kumari Singh", "Female"],
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env.local");
  }

  const [activeYear] = await db
    .select()
    .from(S.academicYears)
    .where(eq(S.academicYears.status, "active"))
    .limit(1);

  if (!activeYear) {
    throw new Error("No active academic year found.");
  }

  const classRows = await db.select().from(S.classes);
  const sectionRows = await db.select().from(S.sections);

  const gradeMap = [6, 7, 8, 9, 10].map((grade) => {
    const cls = classRows.find((c) => c.name === `Grade ${grade}`);

    if (!cls) {
      throw new Error(`Grade ${grade} does not exist. No students inserted.`);
    }

    const sections = sectionRows.filter((s) => s.classId === cls.id).sort((a, b) => a.id - b.id);

    if (!sections.length) {
      throw new Error(`No section found for Grade ${grade}.`);
    }

    return { cls, sections };
  });

  const existing = await db.select({
    admissionNo: S.students.admissionNo,
  }).from(S.students);

  const existingNos = new Set(existing.map((r) => r.admissionNo));

  let added = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    for (let i = 0; i < students.length; i++) {
      const admissionNo = `DEMO-2026-${String(i + 1).padStart(3, "0")}`;

      if (existingNos.has(admissionNo)) {
        skipped++;
        continue;
      }

      const gradeIndex = Math.floor(i / 8);
      const studentIndex = i % 8;
      const { cls, sections } = gradeMap[gradeIndex];

      const sectionIndex =
        sections.length > 1 ? Math.floor(studentIndex / 4) : 0;

      const section = sections[sectionIndex];
      const rollNo =
        sections.length > 1 ? (studentIndex % 4) + 1 : studentIndex + 1;

      const [name, gender] = students[i];
      const serial = String(i + 1).padStart(3, "0");

      const year = 2013 - gradeIndex;
      const month = String((i % 12) + 1).padStart(2, "0");
      const day = String((i % 25) + 1).padStart(2, "0");

      const [student] = await tx
        .insert(S.students)
        .values({
          admissionNo,
          name,
          gender,
          dob: `${year}-${month}-${day}`,
          address: "Hariwon, Sarlahi, Nepal",
          contact: "0000000000",
          email: `demo.student${serial}@example.test`,
          nationality: "Nepali",
          fatherName: `Father of ${name}`,
          motherName: `Mother of ${name}`,
          guardianName: `Father of ${name}`,
          guardianContact: "0000000000",
          guardianOccupation: "Farmer",
          previousSchool: "Demo Previous School",
        })
        .returning({ id: S.students.id });

      await tx.insert(S.enrollments).values({
        studentId: student.id,
        classId: cls.id,
        sectionId: section.id,
        rollNo,
        academicYearId: activeYear.id,
        admissionDate: "2026-04-14",
        status: "active",
      });

      added++;
    }
  });

  console.log("\nStudent insertion completed!");
  console.log(`New students added: ${added}`);
  console.log(`Existing demo records skipped: ${skipped}`);
  console.log(`Academic year: ${activeYear.name}`);
  console.log("Grades: 6, 7, 8, 9 and 10");
}

main()
  .catch((error) => {
    console.error("Insertion failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

