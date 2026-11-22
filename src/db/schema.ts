import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  boolean,
  date,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------------------------------- Users --------------------------------- */

export const roles = pgEnum("role", ["admin", "teacher", "student", "parent"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash").notNull(),
  role: roles("role").notNull().default("student"),
  studentId: integer("student_id"),
  teacherId: integer("teacher_id"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parentChildren = pgTable(
  "parent_children",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("uq_parent_child").on(t.userId, t.studentId)],
);

/* --------------------------------- Students ------------------------------- */

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    admissionNo: varchar("admission_no", { length: 20 }).notNull().unique(),
    name: text("name").notNull(),
    dob: date("dob"),
    gender: varchar("gender", { length: 10 }),
    address: text("address"),
    contact: varchar("contact", { length: 20 }),
    email: text("email"),
    photoUrl: text("photo_url"),
    nationality: varchar("nationality", { length: 30 }).default("Nepali"),
    bloodGroup: varchar("blood_group", { length: 5 }),
    fatherName: text("father_name"),
    motherName: text("mother_name"),
    guardianName: text("guardian_name"),
    guardianContact: varchar("guardian_contact", { length: 20 }),
    guardianOccupation: varchar("guardian_occupation", { length: 60 }),
    previousSchool: text("previous_school"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_students_name").on(t.name), index("idx_students_adm").on(t.admissionNo)],
);

/* --------------------------------- Teachers ------------------------------- */

export const teachers = pgTable(
  "teachers",
  {
    id: serial("id").primaryKey(),
    employeeNo: varchar("employee_no", { length: 20 }).notNull().unique(),
    name: text("name").notNull(),
    dob: date("dob"),
    gender: varchar("gender", { length: 10 }),
    phone: varchar("phone", { length: 20 }),
    email: text("email"),
    qualification: varchar("qualification", { length: 80 }),
    address: text("address"),
    joinDate: date("join_date"),
    status: varchar("status", { length: 12 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_teachers_name").on(t.name)],
);

/* ---------------------------- Structure & Years --------------------------- */

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  level: varchar("level", { length: 15 }).notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const sections = pgTable(
  "sections",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 5 }).notNull(),
  },
  (t) => [uniqueIndex("uq_section").on(t.classId, t.name)],
);

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: varchar("code", { length: 10 }).notNull(),
});

export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  status: varchar("status", { length: 12 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classSubjects = pgTable(
  "class_subjects",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    isClassTeacher: boolean("is_class_teacher").notNull().default(false),
  },
  (t) => [uniqueIndex("uq_class_subject").on(t.classId, t.subjectId)],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    classId: integer("class_id").notNull().references(() => classes.id),
    sectionId: integer("section_id").references(() => sections.id, { onDelete: "set null" }),
    rollNo: integer("roll_no"),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id),
    admissionDate: date("admission_date"),
    status: varchar("status", { length: 12 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_enroll_student").on(t.studentId),
    index("idx_enroll_class").on(t.classId, t.sectionId),
  ],
);

/* -------------------------------- Attendance ------------------------------ */

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    attDate: date("att_date").notNull(),
    status: varchar("status", { length: 2 }).notNull(),
    markedById: integer("marked_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_attendance").on(t.studentId, t.attDate),
    index("idx_att_date").on(t.attDate),
  ],
);

/* ------------------------------ Exams & Marks ----------------------------- */

export const examinations = pgTable(
  "examinations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    examType: varchar("exam_type", { length: 30 }).notNull(),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: varchar("status", { length: 12 }).notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_exams_year").on(t.academicYearId)],
);

export const examSubjects = pgTable(
  "exam_subjects",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id").notNull().references(() => examinations.id, { onDelete: "cascade" }),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").notNull().references(() => subjects.id),
    fullMarks: integer("full_marks").notNull().default(100),
    practicalMarks: integer("practical_marks").notNull().default(0),
    passMarks: integer("pass_marks").notNull().default(40),
  },
  (t) => [
    uniqueIndex("uq_exam_subject").on(t.examId, t.classId, t.subjectId),
    index("idx_examsub_class").on(t.examId, t.classId),
  ],
);

export const marks = pgTable(
  "marks",
  {
    id: serial("id").primaryKey(),
    examSubjectId: integer("exam_subject_id").notNull().references(() => examSubjects.id, { onDelete: "cascade" }),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    theory: integer("theory").notNull().default(0),
    practical: integer("practical").notNull().default(0),
  },
  (t) => [
    uniqueIndex("uq_marks").on(t.examSubjectId, t.studentId),
    index("idx_marks_student").on(t.studentId),
  ],
);

/* ----------------------------- Content & Notices -------------------------- */

export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    classId: integer("class_id").references(() => classes.id, { onDelete: "cascade" }),
    sectionId: integer("section_id").references(() => sections.id, { onDelete: "set null" }),
    subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    type: varchar("type", { length: 8 }).notNull().default("text"),
    content: text("content"),
    url: text("url"),
    fileName: text("file_name"),
    academicYearId: integer("academic_year_id").references(() => academicYears.id),
    uploadedById: integer("uploaded_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_notes_class").on(t.classId, t.sectionId)],
);

export const notices = pgTable(
  "notices",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: varchar("priority", { length: 10 }).notNull().default("normal"),
    classId: integer("class_id").references(() => classes.id),
    sectionId: integer("section_id").references(() => sections.id),
    publishedById: integer("published_by_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_notices_created").on(t.createdAt)],
);

/* ------------------------------- System bits ------------------------------ */

export const gradingScale = pgTable("grading_scale", {
  id: serial("id").primaryKey(),
  grade: varchar("grade", { length: 3 }).notNull(),
  minPct: integer("min_pct").notNull(),
  maxPct: integer("max_pct").notNull(),
  points10: integer("points10").notNull(),
  isFail: boolean("is_fail").notNull().default(false),
  sortOrder: integer("sort_order").notNull(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value"),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: varchar("entity", { length: 30 }),
    entityId: varchar("entity_id", { length: 20 }),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_audit_created").on(t.createdAt)],
);


/* ---------------------------- Fee Management ----------------------------- */

export const feeCategories = pgTable(
  "fee_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const feeStructures = pgTable(
  "fee_structures",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id").notNull().references(() => feeCategories.id, { onDelete: "restrict" }),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "restrict" }),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "restrict" }),
    amountPaisa: integer("amount_paisa").notNull(),
    frequency: varchar("frequency", { length: 20 }).notNull().default("one_time"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_fee_structure").on(t.classId, t.academicYearId, t.categoryId, t.frequency),
    index("idx_fee_structure_class_year").on(t.classId, t.academicYearId),
  ],
);

export const feeInvoices = pgTable(
  "fee_invoices",
  {
    id: serial("id").primaryKey(),
    invoiceNo: varchar("invoice_no", { length: 40 }).notNull().unique(),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
    enrollmentId: integer("enrollment_id").references(() => enrollments.id, { onDelete: "restrict" }),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "restrict" }),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    subtotalPaisa: integer("subtotal_paisa").notNull(),
    discountPaisa: integer("discount_paisa").notNull().default(0),
    totalPaisa: integer("total_paisa").notNull(),
    status: varchar("status", { length: 15 }).notNull().default("issued"),
    notes: text("notes"),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_fee_invoice_student").on(t.studentId),
    index("idx_fee_invoice_year").on(t.academicYearId),
    index("idx_fee_invoice_due").on(t.dueDate),
  ],
);

export const feeInvoiceItems = pgTable(
  "fee_invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id").notNull().references(() => feeInvoices.id, { onDelete: "cascade" }),
    feeStructureId: integer("fee_structure_id").references(() => feeStructures.id, { onDelete: "set null" }),
    categoryId: integer("category_id").notNull().references(() => feeCategories.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    amountPaisa: integer("amount_paisa").notNull(),
    discountPaisa: integer("discount_paisa").notNull().default(0),
    totalPaisa: integer("total_paisa").notNull(),
  },
  (t) => [
    index("idx_fee_invoice_items_invoice").on(t.invoiceId),
  ],
);

export const feePayments = pgTable(
  "fee_payments",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id").notNull().references(() => feeInvoices.id, { onDelete: "restrict" }),
    receiptNo: varchar("receipt_no", { length: 40 }).notNull().unique(),
    amountPaisa: integer("amount_paisa").notNull(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("cash"),
    transactionRef: varchar("transaction_ref", { length: 100 }),
    notes: text("notes"),
    receivedById: integer("received_by_id").references(() => users.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_fee_payment_invoice").on(t.invoiceId),
    index("idx_fee_payment_date").on(t.paidAt),
  ],
);
