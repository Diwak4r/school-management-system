/* Seed script for SJJS SMS — run with: npx tsx src/db/seed.ts (add RESET=1 to re-seed) */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import * as S from "./schema";
import { DEFAULT_SCHOOL } from "./defaults";

const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

function hash(pw: string) {
  const salt = crypto.randomBytes(12).toString("hex");
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2082);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const count = (await db.select({ c: sql<number>`count(*)::int` }).from(S.students))[0]?.c ?? 0;
  if (count > 0 && process.env.RESET !== "1") {
    console.log("Database already seeded. Run with RESET=1 to wipe and re-seed.");
    process.exit(0);
  }
  if (count > 0) {
    const tables = [S.sessions, S.auditLogs, S.notices, S.notes, S.marks, S.examSubjects, S.examinations, S.attendance, S.enrollments, S.classSubjects, S.parentChildren, S.users, S.academicYears, S.sections, S.classes, S.subjects, S.teachers, S.students, S.gradingScale, S.settings];
    for (const t of tables) await db.delete(t);
  }
  console.log("Seeding…");

  /* ------------------------------ Settings ------------------------------ */
  await db.insert(S.settings).values([
    { key: "school_name", value: DEFAULT_SCHOOL.name },
    { key: "school_name_np", value: DEFAULT_SCHOOL.nameNp },
    { key: "school_address", value: DEFAULT_SCHOOL.address },
    { key: "school_contact", value: DEFAULT_SCHOOL.contact },
    { key: "school_email", value: DEFAULT_SCHOOL.email },
    { key: "school_website", value: DEFAULT_SCHOOL.website },
    { key: "school_logo", value: "/images/emblem.png" },
    { key: "principal_name", value: "Suresh Kumar Yadav" },
    { key: "min_attendance", value: "75" },
  ]);

  await db.insert(S.gradingScale).values([
    { grade: "A+", minPct: 90, maxPct: 100, points10: 40, isFail: false, sortOrder: 1 },
    { grade: "A", minPct: 85, maxPct: 89, points10: 36, isFail: false, sortOrder: 2 },
    { grade: "B+", minPct: 80, maxPct: 84, points10: 32, isFail: false, sortOrder: 3 },
    { grade: "B", minPct: 75, maxPct: 79, points10: 28, isFail: false, sortOrder: 4 },
    { grade: "C+", minPct: 70, maxPct: 74, points10: 24, isFail: false, sortOrder: 5 },
    { grade: "C", minPct: 65, maxPct: 69, points10: 20, isFail: false, sortOrder: 6 },
    { grade: "D+", minPct: 60, maxPct: 64, points10: 16, isFail: false, sortOrder: 7 },
    { grade: "D", minPct: 55, maxPct: 59, points10: 12, isFail: false, sortOrder: 8 },
    { grade: "E", minPct: 40, maxPct: 54, points10: 8, isFail: false, sortOrder: 9 },
    { grade: "F", minPct: 0, maxPct: 39, points10: 0, isFail: true, sortOrder: 10 },
  ]);

  /* ---------------------------- Academic years -------------------------- */
  const y1 = (await db.insert(S.academicYears).values({ name: "2080/81", status: "archived" }).returning())[0];
  const y2 = (await db.insert(S.academicYears).values({ name: "2081/82", status: "archived" }).returning())[0];
  const active = (await db.insert(S.academicYears).values({ name: "2082/83", status: "active" }).returning())[0];
  await db.insert(S.academicYears).values({ name: "2083/84", status: "archived" });

  /* -------------------------------- Classes ----------------------------- */
  const classDefs: { name: string; level: string; sections: string[] }[] = [
    { name: "ECD", level: "ECD", sections: ["A"] },
    { name: "Grade 1", level: "Primary", sections: ["A", "B"] },
    { name: "Grade 2", level: "Primary", sections: ["A"] },
    { name: "Grade 3", level: "Primary", sections: ["A", "B"] },
    { name: "Grade 4", level: "Primary", sections: ["A"] },
    { name: "Grade 5", level: "Primary", sections: ["A"] },
    { name: "Grade 6", level: "Secondary", sections: ["A"] },
    { name: "Grade 7", level: "Secondary", sections: ["A"] },
    { name: "Grade 8", level: "Secondary", sections: ["A"] },
    { name: "Grade 9", level: "Secondary", sections: ["A", "B"] },
    { name: "Grade 10", level: "Secondary", sections: ["A", "B"] },
  ];
  const classes: (typeof classDefs[number] & { id: number })[] = [];
  for (let i = 0; i < classDefs.length; i++) {
    const [c] = await db.insert(S.classes).values({ name: classDefs[i].name, level: classDefs[i].level, sortOrder: i }).returning();
    classes.push({ ...classDefs[i], id: c.id });
  }
  const sectionsById: Record<number, { id: number; name: string }[]> = {};
  for (const c of classes) {
    sectionsById[c.id] = [];
    for (const sname of c.sections) {
      const [sec] = await db.insert(S.sections).values({ classId: c.id, name: sname }).returning();
      sectionsById[c.id].push({ id: sec.id, name: sname });
    }
  }

  /* -------------------------------- Subjects ---------------------------- */
  const subjectNames = ["Nepali", "English", "Mathematics", "Science", "Social", "Computer", "Civics", "Local (Bhojpuri)", "Play Way", "Art & Craft"];
  const subjects: Record<string, number> = {};
  const codes: Record<string, string> = { Nepali: "N", English: "E", Mathematics: "M", Science: "S", Social: "SO", Computer: "C", Civics: "CV", "Local (Bhojpuri)": "LB", "Play Way": "PW", "Art & Craft": "AC" };
  for (const n of subjectNames) {
    const [row] = await db.insert(S.subjects).values({ name: n, code: codes[n] }).returning();
    subjects[n] = row.id;
  }
  const classSubjectList: Record<string, string[]> = {
    ECD: ["Play Way", "English", "Nepali"],
    "Grade 1": ["English", "Nepali", "Mathematics", "Science", "Social"],
    "Grade 2": ["English", "Nepali", "Mathematics", "Science", "Social"],
    "Grade 3": ["English", "Nepali", "Mathematics", "Science", "Social"],
    "Grade 4": ["English", "Nepali", "Mathematics", "Science", "Social", "Art & Craft"],
    "Grade 5": ["English", "Nepali", "Mathematics", "Science", "Social", "Art & Craft"],
    "Grade 6": ["English", "Nepali", "Mathematics", "Science", "Social", "Computer"],
    "Grade 7": ["English", "Nepali", "Mathematics", "Science", "Social", "Computer"],
    "Grade 8": ["English", "Nepali", "Mathematics", "Science", "Social", "Computer"],
    "Grade 9": ["English", "Nepali", "Mathematics", "Science", "Social", "Computer", "Civics", "Local (Bhojpuri)"],
    "Grade 10": ["English", "Nepali", "Mathematics", "Science", "Social", "Computer", "Civics", "Local (Bhojpuri)"],
  };

  /* -------------------------------- Teachers ---------------------------- */
  const teacherDefs = [
    { name: "Ramesh Kumar Jha", emp: "SJJS-01", gender: "Male", phone: "9841-000001", email: "ramesh@sjjs.edu.np", qual: "M.Ed, B.Sc. (Math)", dob: "1978-04-12", join: "2011-04-01", address: "Harion, Sarlahi" },
    { name: "Sunita Devi", emp: "SJJS-02", gender: "Female", phone: "9851-000002", email: "sunita@sjjs.edu.np", qual: "B.Ed, M.A. English", dob: "1985-09-23", join: "2015-04-01", address: "Betali, Sarlahi" },
    { name: "Dilip Kumar Yadav", emp: "SJJS-03", gender: "Male", phone: "9808-000003", email: "dilip@sjjs.edu.np", qual: "M.Ed, M.A. Nepali", dob: "1982-01-30", join: "2013-04-01", address: "Harion, Sarlahi" },
    { name: "Anita Kumari", emp: "SJJS-04", gender: "Female", phone: "9860-000004", email: "anita@sjjs.edu.np", qual: "M.Sc. (Biology), B.Ed", dob: "1990-11-05", join: "2018-04-01", address: "Bhawanipur, Sarlahi" },
    { name: "Prakash Chandra Giri", emp: "SJJS-05", gender: "Male", phone: "9818-000005", email: "prakash@sjjs.edu.np", qual: "M.A. (History), B.Ed", dob: "1988-06-17", join: "2017-04-01", address: "Chakara, Sarlahi" },
    { name: "Manisha Thapa", emp: "SJJS-06", gender: "Female", phone: "9845-000006", email: "manisha@sjjs.edu.np", qual: "D.Ed, B.Ed", dob: "1992-02-28", join: "2019-04-01", address: "Harion, Sarlahi" },
    { name: "Bimal Adhikari", emp: "SJJS-07", gender: "Male", phone: "9803-000007", email: "bimal@sjjs.edu.np", qual: "M.C.A, B.Ed", dob: "1987-12-09", join: "2016-04-01", address: "Bhawanipur, Sarlahi" },
    { name: "Sarita Kumari", emp: "SJJS-08", gender: "Female", phone: "9855-000008", email: "sarita@sjjs.edu.np", qual: "B.Sc. (Math), B.Ed", dob: "1993-08-21", join: "2020-04-01", address: "Betali, Sarlahi" },
    { name: "Dinesh Kumar Singh", emp: "SJJS-09", gender: "Male", phone: "9840-000009", email: "dinesh@sjjs.edu.np", qual: "M.Sc. (Physics), B.Ed", dob: "1984-03-14", join: "2014-04-01", address: "Chakara, Sarlahi" },
  ];
  const teachers: Record<string, number> = {};
  for (const t of teacherDefs) {
    const [row] = await db
      .insert(S.teachers)
      .values({
        name: t.name,
        employeeNo: t.emp,
        gender: t.gender,
        phone: t.phone,
        email: t.email,
        qualification: t.qual,
        dob: t.dob,
        joinDate: t.join,
        address: t.address,
        status: "active",
      })
      .returning();
    teachers[t.name] = row.id;
  }

  /* Subject → teacher mapping (for assignments) */
  const subTeacher: Record<string, string> = {
    Mathematics: "Ramesh Kumar Jha",
    English: "Sunita Devi",
    Nepali: "Dilip Kumar Yadav",
    Science: "Anita Kumari",
    Social: "Prakash Chandra Giri",
    Computer: "Bimal Adhikari",
    "Play Way": "Manisha Thapa",
    "Art & Craft": "Sarita Kumari",
    Civics: "Dilip Kumar Yadav",
    "Local (Bhojpuri)": "Dilip Kumar Yadav",
  };
  const ctMap: Record<string, string> = {
    ECD: "Manisha Thapa",
    "Grade 1": "Manisha Thapa",
    "Grade 2": "Dilip Kumar Yadav",
    "Grade 3": "Dilip Kumar Yadav",
    "Grade 4": "Sarita Kumari",
    "Grade 5": "Sarita Kumari",
    "Grade 6": "Prakash Chandra Giri",
    "Grade 7": "Prakash Chandra Giri",
    "Grade 8": "Anita Kumari",
    "Grade 9": "Ramesh Kumar Jha",
    "Grade 10": "Ramesh Kumar Jha",
  };

  for (const c of classes) {
    const subs = classSubjectList[c.name] ?? [];
    for (const subName of subs) {
      const isCT = subTeacher[subName] === ctMap[c.name];
      await db.insert(S.classSubjects).values({
        classId: c.id,
        subjectId: subjects[subName],
        teacherId: teachers[subTeacher[subName]!],
        isClassTeacher: isCT,
      });
    }
  }

  /* -------------------------------- Students ---------------------------- */
  const firstF = ["Rojina", "Sunita", "Mina", "Anita", "Priya", "Sita", "Gita", "Laxmi", "Bharti", "Muna", "Sarita", "Kamala", "Radha", "Bina", "Savita", "Asha", "Kanta", "Maya", "Sujata", "Rima"];
  const firstM = ["Aashish", "Bikash", "Hari", "Kiran", "Suman", "Nabin", "Bhim", "Dinesh", "Mukul", "Rajan", "Kamal", "Sanjay", "Prakash", "Deepak", "Amit", "Raju", "Bimal", "Sunil", "Ramesh", "Jitendra"];
  const lastN = ["Kumar", "Yadav", "Jha", "Singh", "Giri", "Mallik", "Aryal", "Sharma", "Rai", "Tamang", "Maharjan", "Gurung", "Thapa", "Karki", "Poudel", "Adhikari", "Bastola", "Khadka"];
  const wards = ["Harion-1", "Harion-3", "Harion-5", "Harion-8", "Betali-2", "Betali-4", "Chakara-1", "Bhawanipur-2"];
  const jobs = ["Farmer", "Shopkeeper", "Tea garden worker", "Driver", "Government employee", "Tailor", "Mason"];

  const perSection: Record<string, number> = {
    ECD: 12, "Grade 1": 11, "Grade 2": 10, "Grade 3": 10, "Grade 4": 9, "Grade 5": 10,
    "Grade 6": 10, "Grade 7": 9, "Grade 8": 9, "Grade 9": 10, "Grade 10": 10,
  };

  const studentRows: any[] = [];
  const enrollRows: any[] = [];
  const studentMeta: { id?: number; name: string; classIdx: number; sectionIdx: number; gender: string; quality: number; attFactor: number }[] = [];
  let adm = 1001;

  const classOrder = [...classes];
  for (let ci = 0; ci < classOrder.length; ci++) {
    const c = classOrder[ci];
    const secs = sectionsById[c.id];
    const grade = c.name === "ECD" ? 0 : parseInt(c.name.replace("Grade ", ""), 10);
    for (let si = 0; si < secs.length; si++) {
      const sec = secs[si];
      const n = perSection[c.name] ?? 8;
      for (let k = 1; k <= n; k++) {
        const gender = rnd() < 0.5 ? "Female" : "Male";
        const fn = gender === "Female" ? pick(firstF) : pick(firstM);
        const ln = pick(lastN);
        const name = `${fn} ${ln}`;
        const age = grade === 0 ? 4 + Math.floor(rnd() * 2) : grade + 5 + Math.floor(rnd() * 2);
        const bornYear = 2026 - age;
        const dob = `${bornYear}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
        const father = `${pick(firstM)} ${ln}`;
        studentRows.push({
          admissionNo: `ADM-${adm}`,
          name,
          dob,
          gender,
          address: `${pick(wards)}, Sarlahi`,
          contact: `98${String(10000000 + Math.floor(rnd() * 89999999))}`,
          nationality: "Nepali",
          bloodGroup: pick(["A+", "B+", "O+", "AB+", "O-", "A-"]),
          fatherName: father,
          motherName: `${pick(firstF)} ${ln}`,
          guardianName: father,
          guardianContact: `98${String(10000000 + Math.floor(rnd() * 89999999))}`,
          guardianOccupation: pick(jobs),
          previousSchool: grade > 1 && rnd() < 0.3 ? pick(["Sarlahi Government Model School", "Betali Higher Secondary School", "Chakara Primary School"]) : null,
        });
        studentMeta.push({ name, classIdx: ci, sectionIdx: si, gender, quality: 0.42 + rnd() * 0.55, attFactor: 0.82 + rnd() * 0.18 });
        enrollRows.push({
          studentId: adm,
          classId: c.id,
          sectionId: sec.id,
          rollNo: k,
          academicYearId: active.id,
          admissionDate: day(-100 - Math.floor(rnd() * 300)),
          status: "active",
        });
        // previous-year history for grade 2+
        if (grade > 1) {
          const prevYear = grade - 2 >= 0 ? y1 : y2;
          const prevClassIdx = ci - 1;
          const prevClass = classOrder[prevClassIdx];
          const prevSecs = sectionsById[prevClass.id];
          const prevSec = prevSecs[si % prevSecs.length];
          enrollRows.push({
            studentId: adm,
            classId: prevClass.id,
            sectionId: prevSec.id,
            rollNo: k,
            academicYearId: prevYear.id,
            admissionDate: day(-365 - Math.floor(rnd() * 300)),
            status: "promoted",
          });
        }
        adm++;
      }
    }
  }

  const insStudents = await db.insert(S.students).values(studentRows).returning({ id: S.students.id });
  const idMap = new Map(insStudents.map((r, i) => [i + 1001, r.id]));
  const fixedEnrolls = enrollRows.map((e) => ({ ...e, studentId: idMap.get(e.studentId)! }));
  await db.insert(S.enrollments).values(fixedEnrolls);
  console.log(`Students: ${studentRows.length}`);

  /* -------------------------------- Exams ------------------------------- */
  const ft = (await db.insert(S.examinations).values({
    name: "First Terminal Examination",
    examType: "First Terminal Examination",
    academicYearId: active.id,
    startDate: day(-52),
    endDate: day(-46),
    status: "published",
  }).returning())[0];
  const ut = (await db.insert(S.examinations).values({
    name: "Unit Test — Mid Semester",
    examType: "Unit Test",
    academicYearId: active.id,
    startDate: day(-15),
    endDate: day(-11),
    status: "completed",
  }).returning())[0];
  const st = (await db.insert(S.examinations).values({
    name: "Second Terminal Examination",
    examType: "Second Terminal Examination",
    academicYearId: active.id,
    startDate: day(20),
    endDate: day(26),
    status: "scheduled",
  }).returning())[0];

  const practical: Record<string, number> = { Science: 10, Computer: 20 };
  const examSubRows: any[] = [];
  for (const c of classes) {
    const subs = classSubjectList[c.name] ?? [];
    for (const subName of subs) {
      const pm = practical[subName] ?? 0;
      examSubRows.push({ examId: ft.id, classId: c.id, subjectId: subjects[subName], fullMarks: 100, practicalMarks: pm, passMarks: 40 });
      examSubRows.push({ examId: st.id, classId: c.id, subjectId: subjects[subName], fullMarks: 100, practicalMarks: pm, passMarks: 40 });
    }
    if (c.name === "Grade 10") {
      for (const subName of subs) {
        const pm = practical[subName] ?? 0;
        examSubRows.push({ examId: ut.id, classId: c.id, subjectId: subjects[subName], fullMarks: 50, practicalMarks: pm > 0 ? 10 : 0, passMarks: 20 });
      }
    }
  }
  await db.insert(S.examSubjects).values(examSubRows);
  const examSubs = await db.select().from(S.examSubjects);

  /* --------------------------------- Marks ------------------------------ */
  const classEnrollees: Record<number, { studentId: number; quality: number }[]> = {};
  for (const m of studentMeta) {
    const c = classOrder[m.classIdx];
    (classEnrollees[c.id] ??= []).push({ studentId: idMap.get(m.classIdx * 100 + m.sectionIdx * 100 + 0) ?? 0, quality: m.quality });
  }
  // recompute student id correctly
  {
    let idx = 1001;
    const rebuilt: Record<number, { studentId: number; quality: number }[]> = {};
    for (let ci = 0; ci < classOrder.length; ci++) {
      const c = classOrder[ci];
      const secs = sectionsById[c.id];
      for (let si = 0; si < secs.length; si++) {
        const n = perSection[c.name] ?? 8;
        for (let k = 0; k < n; k++) {
          (rebuilt[c.id] ??= []).push({ studentId: idMap.get(idx)!, quality: studentMeta[idx - 1001].quality });
          idx++;
        }
      }
    }
    Object.assign(classEnrollees, rebuilt);
    // replace placeholders with correct ids
    for (const key of Object.keys(classEnrollees)) classEnrollees[Number(key)] = rebuilt[Number(key)] ?? classEnrollees[Number(key)];
  }

  const markRows: any[] = [];
  for (const es of examSubs) {
    const roster = classEnrollees[es.classId] ?? [];
    const theoryFull = es.fullMarks - es.practicalMarks;
    const doUnitPartial = es.examId === ut.id; // only first 6 students get unit-test marks
    roster.forEach((r, i) => {
      if (doUnitPartial && i >= 6) return;
      const q = Math.min(0.98, Math.max(0.3, r.quality + (rnd() - 0.5) * 0.18));
      const theory = Math.round(theoryFull * q);
      const prac = es.practicalMarks > 0 ? Math.round(es.practicalMarks * Math.min(1, q + 0.12)) : 0;
      markRows.push({ examSubjectId: es.id, studentId: r.studentId, theory, practical: prac });
    });
  }
  await db.insert(S.marks).values(markRows);
  console.log(`Marks: ${markRows.length}`);

  /* ------------------------------ Attendance ---------------------------- */
  const attRows: any[] = [];
  const allStudentIds = [...idMap.values()];
  for (let off = -30; off <= -1; off++) {
    const d = new Date();
    d.setDate(d.getDate() + off);
    if (d.getDay() === 0) continue; // Sunday
    const dateStr = d.toISOString().slice(0, 10);
    let mi = 1001;
    for (const m of studentMeta) {
      const r = rnd();
      const status = r < m.attFactor * 0.95 ? "P" : r < m.attFactor * 0.98 ? "L" : r < m.attFactor * 0.985 + 0.03 ? "A" : "LV";
      attRows.push({ studentId: idMap.get(mi)!, attDate: dateStr, status, markedById: null });
      mi++;
    }
  }
  await db.insert(S.attendance).values(attRows);
  console.log(`Attendance: ${attRows.length}`);

  /* --------------------------------- Users ------------------------------ */
  const adminUser = (await db.insert(S.users).values({
    name: "Suresh Kumar Yadav",
    email: "admin@sjjs.edu.np",
    passwordHash: hash("admin123"),
    role: "admin",
  }).returning())[0];
  await db.update(S.attendance).set({ markedById: adminUser.id });

  const teacherUsers: Record<string, number> = {};
  for (const t of teacherDefs) {
    const tRow = (await db.select().from(S.teachers).where(eq(S.teachers.name, t.name)).limit(1))[0];
    const [u] = await db.insert(S.users).values({
      name: t.name,
      email: t.email,
      passwordHash: hash("teacher123"),
      role: "teacher",
      teacherId: tRow.id,
    }).returning();
    teacherUsers[t.name] = u.id;
  }

  const g10 = classOrder[10];
  const g5 = classOrder[5];
  const g10SecA = sectionsById[g10.id][0];
  const g10SecB = sectionsById[g10.id][1];
  const tenA = fixedEnrolls.find((e) => e.classId === g10.id && e.sectionId === g10SecA.id && e.status === "active")!;
  const tenB = fixedEnrolls.find((e) => e.classId === g10.id && e.sectionId === g10SecB.id && e.status === "active")!;
  const fiveA = fixedEnrolls.find((e) => e.classId === g5.id && e.status === "active" && e.rollNo === 1)!;

  const studentEmails: [number, string][] = [
    [tenA.studentId, "student@sjjs.edu.np"],
    [tenB.studentId, "student2@sjjs.edu.np"],
    [fiveA.studentId, "student3@sjjs.edu.np"],
  ];
  for (const [sid, email] of studentEmails) {
    const stRow = (await db.select().from(S.students).where(eq(S.students.id, sid)).limit(1))[0];
    if (!stRow) continue;
    await db.insert(S.users).values({
      name: stRow.name,
      email,
      passwordHash: hash("student123"),
      role: "student",
      studentId: sid,
    });
  }

  const parent = (await db.insert(S.users).values({
    name: "Raj Kumar Jha",
    email: "parent@sjjs.edu.np",
    passwordHash: hash("parent123"),
    role: "parent",
  }).returning())[0];
  await db.insert(S.parentChildren).values([
    { userId: parent.id, studentId: tenA.studentId },
    { userId: parent.id, studentId: tenB.studentId },
  ]);

  /* --------------------------------- Notes ------------------------------ */
  const noteCommon = { academicYearId: active.id } as const;
  await db.insert(S.notes).values([
    { ...noteCommon, title: "Mathematics — Fractions worksheet (Grade 10)", classId: g10.id, sectionId: g10SecA.id, subjectId: subjects["Mathematics"], type: "text", content: "Solve the following:\n1) 3/4 + 5/6\n2) 7/8 − 2/3\n3) 5/7 × 14/25\n4) 9/10 ÷ 3/5\n\nShow each step. Submit before Friday.", url: null, fileName: null, uploadedById: teacherUsers["Ramesh Kumar Jha"] },
    { ...noteCommon, title: "Science — Photosynthesis notes", classId: g10.id, sectionId: g10SecA.id, subjectId: subjects["Science"], type: "text", content: "Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (in presence of chlorophyll & sunlight).\n\nKey points:\n• Occurs in chloroplasts\n• Products: glucose + oxygen\n• Factors: light intensity, CO₂ concentration, temperature\n\nMCQ practice set will be shared before the Second Terminal.", url: null, fileName: null, uploadedById: teacherUsers["Anita Kumari"] },
    { ...noteCommon, title: "Nepali — कविता 'हम नेपाली हौं' व्याकरण", classId: g10.id, sectionId: null, subjectId: subjects["Nepali"], type: "text", content: "कविताको पंक्तिबारे:\n• अलंकार पहिचान गर्नुहोस्\n• अनुमान र अभिप्राय लेख्नुहोस्\n• ५ वटा सन्दर्भ प्रश्नको उत्तर तयार पार्नुहोस्।", url: null, fileName: null, uploadedById: teacherUsers["Dilip Kumar Yadav"] },
    { ...noteCommon, title: "English — Tense exercise (Grade 5)", classId: g5.id, sectionId: sectionsById[g5.id][0].id, subjectId: subjects["English"], type: "link", content: "Read the reference page, then complete the 10-sentence exercise in your notebook.", url: "https://www.grammarly.com/blog/tenses/", fileName: null, uploadedById: teacherUsers["Sunita Devi"] },
    { ...noteCommon, title: "Social — Map of Sarlahi district", classId: g10.id, sectionId: null, subjectId: subjects["Social"], type: "text", content: "Label the following on your blank map of Sarlahi district:\n• District headquarters (Arghali)\n• All municipalities and sub-metropolitan cities\n• Major rivers (Koshi, Kamla, Sunaudi)\nDue date: next Social class.", url: null, fileName: null, uploadedById: teacherUsers["Prakash Chandra Giri"] },
    { ...noteCommon, title: "Computer — Basics of spreadsheet", classId: g10.id, sectionId: null, subjectId: subjects["Computer"], type: "text", content: "Practice: create a spreadsheet with columns Name, Marks, Percentage.\nUse formula =C2/B2 for percentage. Screenshot your sheet as assignment.", url: null, fileName: null, uploadedById: teacherUsers["Bimal Adhikari"] },
  ]);

  /* -------------------------------- Notices ----------------------------- */
  const noticeRows: any[] = [
    { title: "Second Terminal Examination date sheet published", body: "The Second Terminal Examination will begin in three weeks. The full date sheet has been shared with each class. Students are advised to revise from the unit test questions and class notes. Parents are requested to support regular study at home.", priority: "important", classId: null, sectionId: null, publishedById: adminUser.id, expiresAt: new Date(Date.now() + 20 * 86400_000) },
    { title: "Parent\u2013Teacher Meeting", body: "PTM will be held in the school multipurpose hall, 10:00 AM. Grade 10 & 9 parents in the morning; other grades in the afternoon. Class teachers will share individual progress reports.", priority: "important", classId: null, sectionId: null, publishedById: adminUser.id, expiresAt: new Date(Date.now() + 10 * 86400_000) },
    { title: "Dashain holiday notice", body: "The school will remain closed for Dashain Tihar vacations as per the government circular. Classes will resume on the first working day after the holiday. No assessments will be conducted during the break.", priority: "normal", classId: null, sectionId: null, publishedById: adminUser.id, expiresAt: null },
    { title: "Grade 10 \u2014 SEB registration reminder", body: "Parents of Grade 10 students: bring the student's citizenship copy and two passport-size photos for SEB registration. Submit to the class teacher before Friday.", priority: "important", classId: g10.id, sectionId: null, publishedById: teacherUsers["Ramesh Kumar Jha"], expiresAt: null },
    { title: "New library books available", body: "The school library has received 120 new books including NEB past questions (Grades 8\u201310), story books and dictionaries. Borrowing hours: 2:00\u20134:00 PM. Two books per student per term.", priority: "normal", classId: null, sectionId: null, publishedById: adminUser.id, expiresAt: null },
  ];
  await db.insert(S.notices).values(noticeRows);

  /* ------------------------------ Audit logs ---------------------------- */
  await db.insert(S.auditLogs).values([
    { userId: adminUser.id, action: "Seeded demo data", entity: "system", details: "Initial data for Shree Jana Jagriti Secondary School" },
    { userId: adminUser.id, action: "Published results", entity: "exam", entityId: String(ft.id), details: "First Terminal Examination" },
    { userId: teacherUsers["Ramesh Kumar Jha"], action: "Entered marks", entity: "marks", details: "First Terminal Examination" },
  ]);

  console.log("Seed complete.");
  console.log("Demo logins:");
  console.log("  admin@sjjs.edu.np / admin123");
  console.log("  ramesh@sjjs.edu.np / teacher123");
  console.log("  student@sjjs.edu.np / student123");
  console.log("  parent@sjjs.edu.np / parent123");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
