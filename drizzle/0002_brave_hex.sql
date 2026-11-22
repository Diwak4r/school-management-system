CREATE TABLE "fee_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fee_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"fee_structure_id" integer,
	"category_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount_paisa" integer NOT NULL,
	"discount_paisa" integer DEFAULT 0 NOT NULL,
	"total_paisa" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_no" varchar(40) NOT NULL,
	"student_id" integer NOT NULL,
	"enrollment_id" integer,
	"academic_year_id" integer NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"subtotal_paisa" integer NOT NULL,
	"discount_paisa" integer DEFAULT 0 NOT NULL,
	"total_paisa" integer NOT NULL,
	"status" varchar(15) DEFAULT 'issued' NOT NULL,
	"notes" text,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_invoices_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"receipt_no" varchar(40) NOT NULL,
	"amount_paisa" integer NOT NULL,
	"payment_method" varchar(20) DEFAULT 'cash' NOT NULL,
	"transaction_ref" varchar(100),
	"notes" text,
	"received_by_id" integer,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_payments_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"academic_year_id" integer NOT NULL,
	"amount_paisa" integer NOT NULL,
	"frequency" varchar(20) DEFAULT 'one_time' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_fee_structure_id_fee_structures_id_fk" FOREIGN KEY ("fee_structure_id") REFERENCES "public"."fee_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_category_id_fee_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."fee_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_category_id_fee_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."fee_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_items_invoice" ON "fee_invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_student" ON "fee_invoices" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_year" ON "fee_invoices" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_fee_invoice_due" ON "fee_invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_fee_payment_invoice" ON "fee_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_fee_payment_date" ON "fee_payments" USING btree ("paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_fee_structure" ON "fee_structures" USING btree ("class_id","academic_year_id","category_id","frequency");--> statement-breakpoint
CREATE INDEX "idx_fee_structure_class_year" ON "fee_structures" USING btree ("class_id","academic_year_id");