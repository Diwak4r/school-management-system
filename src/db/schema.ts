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

/* --------------------------------- Tenancy -------------------------------- */

export const roles = pgEnum("role", ["admin", "teacher", "student", "parent"]);

export const schools = pgTable(
  "schools",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nameNp: text("name_np"),
    code: varchar("code", { length: 30 }).notNull().unique(),
    registrationNo: varchar("registration_no", { length: 60 }),
    address: text("address"),
    province: varchar("province", { length: 60 }),
    district: varchar("district", { length: 60 }),
    municipality: varchar("municipality", { length: 60 }),
    wardNo: varchar("ward_no", { length: 10 }),
    contactEmail: text("contact_email"),
    phone: varchar("phone", { length: 30 }),
    principalName: text("principal_name"),
    logoUrl: text("logo_url"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("approved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_schools_status").on(t.status),
    index("idx_schools_approval").on(t.approvalStatus),
  ],
);

/** Every domain row belongs to one school. Default 1 preserves existing single-school inserts. */
const schoolFk = () =>
  integer("school_id")
    .notNull()
    .default(1)
    .references(() => schools.id, { onDelete: "restrict" });

/* ---------------------------------- Users --------------------------------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    name: text("name").notNull(),
    // Global uniqueness is intentional: login identifies a person by email only.
    email: text("email").notNull().unique(),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash").notNull(),
    role: roles("role").notNull().default("student"),
    studentId: integer("student_id"),
    teacherId: integer("teacher_id"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_users_school").on(t.schoolId), index("idx_users_active").on(t.isActive)],
);

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
    schoolId: schoolFk(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("uq_parent_child").on(t.schoolId, t.userId, t.studentId),
    index("idx_parent_children_school").on(t.schoolId),
  ],
);

/* --------------------------------- Students ------------------------------- */

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    admissionNo: varchar("admission_no", { length: 20 }).notNull(),
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
  (t) => [
    uniqueIndex("uq_student_admission").on(t.schoolId, t.admissionNo),
    index("idx_students_name").on(t.schoolId, t.name),
    index("idx_students_adm").on(t.schoolId, t.admissionNo),
  ],
);

/* --------------------------------- Teachers ------------------------------- */

export const teachers = pgTable(
  "teachers",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    employeeNo: varchar("employee_no", { length: 20 }).notNull(),
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
  (t) => [
    uniqueIndex("uq_teacher_employee").on(t.schoolId, t.employeeNo),
    index("idx_teachers_name").on(t.schoolId, t.name),
  ],
);

/* ---------------------------- Structure & Years --------------------------- */

export const classes = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    name: text("name").notNull(),
    level: varchar("level", { length: 15 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [uniqueIndex("uq_class_name").on(t.schoolId, t.name)],
);

export const sections = pgTable(
  "sections",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 5 }).notNull(),
  },
  (t) => [uniqueIndex("uq_section").on(t.schoolId, t.classId, t.name)],
);

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    name: text("name").notNull(),
    code: varchar("code", { length: 10 }).notNull(),
  },
  (t) => [uniqueIndex("uq_subject_name").on(t.schoolId, t.name)],
);

export const academicYears = pgTable(
  "academic_years",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    name: text("name").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_academic_year_name").on(t.schoolId, t.name)],
);

export const classSubjects = pgTable(
  "class_subjects",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    isClassTeacher: boolean("is_class_teacher").notNull().default(false),
  },
  (t) => [uniqueIndex("uq_class_subject").on(t.schoolId, t.classId, t.subjectId)],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
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
    index("idx_enroll_student").on(t.schoolId, t.studentId),
    index("idx_enroll_class").on(t.schoolId, t.classId, t.sectionId),
  ],
);

/* -------------------------------- Attendance ------------------------------ */

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    attDate: date("att_date").notNull(),
    status: varchar("status", { length: 2 }).notNull(),
    markedById: integer("marked_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_attendance").on(t.schoolId, t.studentId, t.attDate),
    index("idx_att_date").on(t.schoolId, t.attDate),
  ],
);

/* ------------------------------ Exams & Marks ----------------------------- */

export const examinations = pgTable(
  "examinations",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    name: text("name").notNull(),
    examType: varchar("exam_type", { length: 30 }).notNull(),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: varchar("status", { length: 12 }).notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_exams_year").on(t.schoolId, t.academicYearId)],
);

export const examSubjects = pgTable(
  "exam_subjects",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    examId: integer("exam_id").notNull().references(() => examinations.id, { onDelete: "cascade" }),
    classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").notNull().references(() => subjects.id),
    fullMarks: integer("full_marks").notNull().default(100),
    practicalMarks: integer("practical_marks").notNull().default(0),
    passMarks: integer("pass_marks").notNull().default(40),
  },
  (t) => [
    uniqueIndex("uq_exam_subject").on(t.schoolId, t.examId, t.classId, t.subjectId),
    index("idx_examsub_class").on(t.schoolId, t.examId, t.classId),
  ],
);

export const marks = pgTable(
  "marks",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    examSubjectId: integer("exam_subject_id").notNull().references(() => examSubjects.id, { onDelete: "cascade" }),
    studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    theory: integer("theory").notNull().default(0),
    practical: integer("practical").notNull().default(0),
  },
  (t) => [
    uniqueIndex("uq_marks").on(t.schoolId, t.examSubjectId, t.studentId),
    index("idx_marks_student").on(t.schoolId, t.studentId),
  ],
);

/* ----------------------------- Content & Notices -------------------------- */

export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
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
  (t) => [index("idx_notes_class").on(t.schoolId, t.classId, t.sectionId)],
);

export const notices = pgTable(
  "notices",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: varchar("priority", { length: 10 }).notNull().default("normal"),
    classId: integer("class_id").references(() => classes.id),
    sectionId: integer("section_id").references(() => sections.id),
    publishedById: integer("published_by_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_notices_created").on(t.schoolId, t.createdAt)],
);

/* ------------------------------- System bits ------------------------------ */

export const gradingScale = pgTable(
  "grading_scale",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    grade: varchar("grade", { length: 3 }).notNull(),
    minPct: integer("min_pct").notNull(),
    maxPct: integer("max_pct").notNull(),
    points10: integer("points10").notNull(),
    isFail: boolean("is_fail").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [uniqueIndex("uq_grading_grade").on(t.schoolId, t.grade)],
);

/**
 * Global key/value configuration. School identity now lives in `schools`;
 * these keys remain for the active school's display settings and min attendance.
 */
export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value"),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: varchar("entity", { length: 30 }),
    entityId: varchar("entity_id", { length: 20 }),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_audit_created").on(t.schoolId, t.createdAt)],
);

/* ---------------------------- Fee Management ----------------------------- */

export const feeCategories = pgTable(
  "fee_categories",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_fee_category_name").on(t.schoolId, t.name)],
);

export const feeStructures = pgTable(
  "fee_structures",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
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
    uniqueIndex("uq_fee_structure").on(t.schoolId, t.classId, t.academicYearId, t.categoryId, t.frequency),
    index("idx_fee_structure_class_year").on(t.schoolId, t.classId, t.academicYearId),
  ],
);

export const feeInvoices = pgTable(
  "fee_invoices",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    invoiceNo: varchar("invoice_no", { length: 40 }).notNull(),
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
    uniqueIndex("uq_fee_invoice_no").on(t.schoolId, t.invoiceNo),
    index("idx_fee_invoice_student").on(t.schoolId, t.studentId),
    index("idx_fee_invoice_year").on(t.schoolId, t.academicYearId),
    index("idx_fee_invoice_due").on(t.schoolId, t.dueDate),
  ],
);

export const feeInvoiceItems = pgTable(
  "fee_invoice_items",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    invoiceId: integer("invoice_id").notNull().references(() => feeInvoices.id, { onDelete: "cascade" }),
    feeStructureId: integer("fee_structure_id").references(() => feeStructures.id, { onDelete: "set null" }),
    categoryId: integer("category_id").notNull().references(() => feeCategories.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    amountPaisa: integer("amount_paisa").notNull(),
    discountPaisa: integer("discount_paisa").notNull().default(0),
    totalPaisa: integer("total_paisa").notNull(),
  },
  (t) => [
    index("idx_fee_invoice_items_invoice").on(t.schoolId, t.invoiceId),
  ],
);

/* ----------------------------- SaaS platform ------------------------------ */

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 40 }).notNull().unique(),
    description: text("description"),
    monthlyPaisa: integer("monthly_paisa").notNull().default(0),
    annualPaisa: integer("annual_paisa").notNull().default(0),
    studentLimit: integer("student_limit"),
    features: text("features"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_plans_active").on(t.isActive)],
);

export const schoolSubscriptions = pgTable(
  "school_subscriptions",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "restrict" }),
    planId: integer("plan_id").notNull().references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("trial"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_school_subscription").on(t.schoolId),
    index("idx_subscriptions_status").on(t.status),
    index("idx_subscriptions_expiry").on(t.expiresAt),
  ],
);

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feePayments = pgTable(
  "fee_payments",
  {
    id: serial("id").primaryKey(),
    schoolId: schoolFk(),
    invoiceId: integer("invoice_id").notNull().references(() => feeInvoices.id, { onDelete: "restrict" }),
    receiptNo: varchar("receipt_no", { length: 40 }).notNull(),
    amountPaisa: integer("amount_paisa").notNull(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("cash"),
    transactionRef: varchar("transaction_ref", { length: 100 }),
    notes: text("notes"),
    receivedById: integer("received_by_id").references(() => users.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_fee_receipt_no").on(t.schoolId, t.receiptNo),
    index("idx_fee_payment_invoice").on(t.schoolId, t.invoiceId),
    index("idx_fee_payment_date").on(t.schoolId, t.paidAt),
  ],
);
