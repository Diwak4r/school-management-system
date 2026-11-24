CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_np" text,
	"code" varchar(30) NOT NULL,
	"registration_no" varchar(60),
	"address" text,
	"province" varchar(60),
	"district" varchar(60),
	"municipality" varchar(60),
	"ward_no" varchar(10),
	"contact_email" text,
	"phone" varchar(30),
	"principal_name" text,
	"logo_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"approval_status" varchar(20) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
-- Backfill the existing single school from the current settings table before
-- any school_id foreign key is added. All existing rows default to school 1.
INSERT INTO "schools" (
  "id", "name", "name_np", "code", "registration_no", "address",
  "contact_email", "phone", "principal_name", "logo_url",
  "status", "approval_status"
)
SELECT
  1,
  coalesce(max(case when key = 'school_name' then value end), 'ShikshaSetu School'),
  max(case when key = 'school_name_np' then value end),
  'SJJS-001',
  max(case when key = 'school_registration_no' then value end),
  coalesce(max(case when key = 'school_address' then value end), 'Harion-8 (Betali), Sarlahi, Nepal'),
  max(case when key = 'school_email' then value end),
  max(case when key = 'school_contact' then value end),
  max(case when key = 'principal_name' then value end),
  max(case when key = 'school_logo' then value end),
  'active',
  'approved'
FROM "settings";
--> statement-breakpoint
ALTER TABLE "academic_years" DROP CONSTRAINT "academic_years_name_unique";--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_name_unique";--> statement-breakpoint
ALTER TABLE "fee_categories" DROP CONSTRAINT "fee_categories_name_unique";--> statement-breakpoint
ALTER TABLE "fee_invoices" DROP CONSTRAINT "fee_invoices_invoice_no_unique";--> statement-breakpoint
ALTER TABLE "fee_payments" DROP CONSTRAINT "fee_payments_receipt_no_unique";--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_admission_no_unique";--> statement-breakpoint
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_name_unique";--> statement-breakpoint
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_employee_no_unique";--> statement-breakpoint
DROP INDEX "uq_attendance";--> statement-breakpoint
DROP INDEX "idx_att_date";--> statement-breakpoint
DROP INDEX "idx_audit_created";--> statement-breakpoint
DROP INDEX "uq_class_subject";--> statement-breakpoint
DROP INDEX "idx_enroll_student";--> statement-breakpoint
DROP INDEX "idx_enroll_class";--> statement-breakpoint
DROP INDEX "uq_exam_subject";--> statement-breakpoint
DROP INDEX "idx_examsub_class";--> statement-breakpoint
DROP INDEX "idx_exams_year";--> statement-breakpoint
DROP INDEX "idx_fee_invoice_items_invoice";--> statement-breakpoint
DROP INDEX "idx_fee_invoice_student";--> statement-breakpoint
DROP INDEX "idx_fee_invoice_year";--> statement-breakpoint
DROP INDEX "idx_fee_invoice_due";--> statement-breakpoint
DROP INDEX "idx_fee_payment_invoice";--> statement-breakpoint
DROP INDEX "idx_fee_payment_date";--> statement-breakpoint
DROP INDEX "uq_fee_structure";--> statement-breakpoint
DROP INDEX "idx_fee_structure_class_year";--> statement-breakpoint
DROP INDEX "uq_marks";--> statement-breakpoint
DROP INDEX "idx_marks_student";--> statement-breakpoint
DROP INDEX "idx_notes_class";--> statement-breakpoint
DROP INDEX "idx_notices_created";--> statement-breakpoint
DROP INDEX "uq_parent_child";--> statement-breakpoint
DROP INDEX "uq_section";--> statement-breakpoint
DROP INDEX "idx_students_name";--> statement-breakpoint
DROP INDEX "idx_students_adm";--> statement-breakpoint
DROP INDEX "idx_teachers_name";--> statement-breakpoint
ALTER TABLE "academic_years" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_subjects" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "examinations" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_categories" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "grading_scale" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "marks" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "parent_children" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_schools_status" ON "schools" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_schools_approval" ON "schools" USING btree ("approval_status");--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_scale" ADD CONSTRAINT "grading_scale_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_academic_year_name" ON "academic_years" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_class_name" ON "classes" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fee_category_name" ON "fee_categories" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fee_invoice_no" ON "fee_invoices" USING btree ("school_id","invoice_no");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fee_receipt_no" ON "fee_payments" USING btree ("school_id","receipt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_grading_grade" ON "grading_scale" USING btree ("school_id","grade");--> statement-breakpoint
CREATE INDEX "idx_parent_children_school" ON "parent_children" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_student_admission" ON "students" USING btree ("school_id","admission_no");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subject_name" ON "subjects" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_teacher_employee" ON "teachers" USING btree ("school_id","employee_no");--> statement-breakpoint
CREATE INDEX "idx_users_school" ON "users" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance" ON "attendance" USING btree ("school_id","student_id","att_date");--> statement-breakpoint
CREATE INDEX "idx_att_date" ON "attendance" USING btree ("school_id","att_date");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_class_subject" ON "class_subjects" USING btree ("school_id","class_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_enroll_student" ON "enrollments" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_enroll_class" ON "enrollments" USING btree ("school_id","class_id","section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exam_subject" ON "exam_subjects" USING btree ("school_id","exam_id","class_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_examsub_class" ON "exam_subjects" USING btree ("school_id","exam_id","class_id");--> statement-breakpoint
CREATE INDEX "idx_exams_year" ON "examinations" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_items_invoice" ON "fee_invoice_items" USING btree ("school_id","invoice_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_student" ON "fee_invoices" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_year" ON "fee_invoices" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_due" ON "fee_invoices" USING btree ("school_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_fee_payment_invoice" ON "fee_payments" USING btree ("school_id","invoice_id");--> statement-breakpoint
CREATE INDEX "idx_fee_payment_date" ON "fee_payments" USING btree ("school_id","paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fee_structure" ON "fee_structures" USING btree ("school_id","class_id","academic_year_id","category_id","frequency");--> statement-breakpoint
CREATE INDEX "idx_fee_structure_class_year" ON "fee_structures" USING btree ("school_id","class_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_marks" ON "marks" USING btree ("school_id","exam_subject_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_marks_student" ON "marks" USING btree ("school_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_notes_class" ON "notes" USING btree ("school_id","class_id","section_id");--> statement-breakpoint
CREATE INDEX "idx_notices_created" ON "notices" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_parent_child" ON "parent_children" USING btree ("school_id","user_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_section" ON "sections" USING btree ("school_id","class_id","name");--> statement-breakpoint
CREATE INDEX "idx_students_name" ON "students" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "idx_students_adm" ON "students" USING btree ("school_id","admission_no");--> statement-breakpoint
CREATE INDEX "idx_teachers_name" ON "teachers" USING btree ("school_id","name");