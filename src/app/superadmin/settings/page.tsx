import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { savePlatformSettings } from "@/actions/platform";
import { Badge, Field, Icon, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  const rows = await db.select().from(platformSettings);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value ?? ""]));
  const bool = (key: string) => values[key] === "true";

  return (
    <div className="space-y-6">
      <PageHead title="Platform settings" sub="Global settings only. School settings remain separate.">
        <Badge tone={bool("maintenance_mode") ? "amber" : "green"}>
          {bool("maintenance_mode") ? "Maintenance mode" : "Operational"}
        </Badge>
      </PageHead>

      <form action={savePlatformSettings} className="card space-y-5 p-5">
        <section>
          <h2 className="font-display text-base font-semibold text-ink">Identity and contact</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Platform name"><input name="platform_name" defaultValue={values.platform_name ?? "ShikshaSetu"} className="inp" /></Field>
            <Field label="Platform email"><input name="platform_email" type="email" defaultValue={values.platform_email ?? ""} className="inp" /></Field>
            <Field label="Contact number"><input name="platform_contact" defaultValue={values.platform_contact ?? ""} className="inp" /></Field>
            <Field label="Default currency"><input name="default_currency" defaultValue={values.default_currency ?? "NPR"} className="inp" /></Field>
          </div>
        </section>

        <section className="border-t border-linesoft pt-5">
          <h2 className="font-display text-base font-semibold text-ink">Registration and schools</h2>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-inksoft">
              <input type="checkbox" name="registration_enabled" defaultChecked={bool("registration_enabled")} className="h-4 w-4 accent-forest" />
              Allow new registrations
            </label>
            <label className="flex items-center gap-2 text-sm text-inksoft">
              <input type="checkbox" name="school_approval_required" defaultChecked={bool("school_approval_required")} className="h-4 w-4 accent-forest" />
              Require platform approval for new schools
            </label>
          </div>
        </section>

        <section className="border-t border-linesoft pt-5">
          <h2 className="font-display text-base font-semibold text-ink">Operations</h2>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-inksoft">
              <input type="checkbox" name="maintenance_mode" defaultChecked={bool("maintenance_mode")} className="h-4 w-4 accent-forest" />
              Maintenance mode
            </label>
            <div className="flex items-center gap-2 text-sm text-inksoft">
              <Icon name={bool("email_configured") ? "check" : "alert"} className="h-4 w-4" />
              Email configuration: {bool("email_configured") ? "configured" : "not configured"}
              <input type="checkbox" name="email_configured" defaultChecked={bool("email_configured")} className="ml-2 h-4 w-4 accent-forest" />
              <span className="text-xs text-muted">(status flag only — no credentials stored here)</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end border-t border-linesoft pt-4">
          <button className="btn-primary btn-sm" type="submit">Save platform settings</button>
        </div>
      </form>
    </div>
  );
}
