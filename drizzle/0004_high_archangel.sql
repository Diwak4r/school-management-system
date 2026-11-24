CREATE TABLE "platform_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'trial' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(40) NOT NULL,
	"description" text,
	"monthly_paisa" integer DEFAULT 0 NOT NULL,
	"annual_paisa" integer DEFAULT 0 NOT NULL,
	"student_limit" integer,
	"features" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_school_subscription" ON "school_subscriptions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "school_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_expiry" ON "school_subscriptions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_plans_active" ON "subscription_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active");
--> statement-breakpoint
-- Default plans and settings. Prices are stored in paisa (NPR).
INSERT INTO "subscription_plans" ("name", "slug", "description", "monthly_paisa", "annual_paisa", "student_limit", "features", "sort_order") VALUES
  ('Free', 'free', 'Limited students, basic school management and basic reports.', 0, 0, 50, E'Up to 50 students\nBasic school management\nBasic reports', 0),
  ('Basic', 'basic', 'Student, teacher, attendance and examination management.', 150000, 1500000, 300, E'Student management\nTeacher management\nAttendance\nExamination and results', 1),
  ('Professional', 'professional', 'Everything in Basic with fees and advanced reporting.', 400000, 4000000, 1000, E'All Basic features\nFee management\nAdvanced reports\nAdministrative tools', 2),
  ('Enterprise', 'enterprise', 'Everything in Professional with analytics and priority support.', 1000000, 10000000, NULL, E'All Professional features\nAdvanced analytics\nPriority support\nCustom configuration', 3)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "school_subscriptions" ("school_id", "plan_id", "status", "starts_at")
SELECT 1, id, 'active', now() FROM "subscription_plans" WHERE slug = 'free'
ON CONFLICT ("school_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platform_settings" ("key", "value") VALUES
  ('platform_name', 'ShikshaSetu'),
  ('platform_email', 'info@shikshasetu.edu.np'),
  ('platform_contact', ''),
  ('default_currency', 'NPR'),
  ('registration_enabled', 'true'),
  ('school_approval_required', 'true'),
  ('maintenance_mode', 'false'),
  ('email_configured', 'false')
ON CONFLICT ("key") DO NOTHING;