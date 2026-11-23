
import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings as settingsTable, gradingScale } from "@/db/schema";
import { requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { getSchool } from "@/lib/grading";
import { PageHead, Icon, Field, Badge } from "@/components/ui";
import { RestoreForm } from "./RestoreForm";

export const dynamic = "force-dynamic";

async function upsertSetting(key: string, value: string) {
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settingsTable)
      .set({ value })
      .where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

export async function saveSchoolSettings(formData: FormData) {
  "use server";

  const user = await requireRole("admin");

  const map: [string, FormDataEntryValue | null][] = [
    ["school_name", formData.get("name")],
    ["school_name_np", formData.get("nameNp")],
    ["school_address", formData.get("address")],
    ["school_contact", formData.get("contact")],
    ["school_email", formData.get("email")],
    ["school_website", formData.get("website")],
    ["school_logo", formData.get("logoUrl")],
    ["principal_name", formData.get("principal")],
    ["min_attendance", formData.get("minAttendance")],
  ];

  for (const [k, v] of map) {
    const s = String(v ?? "").trim();
    if (s) await upsertSetting(k, s);
  }

  await logAudit(user.id, "Updated school settings", "settings");
  await flashTo("/settings", "School settings saved.");
}

export async function saveScaleRow(formData: FormData) {
  "use server";

  const user = await requireRole("admin");

  const id = Number(formData.get("id") ?? 0);
  const grade = String(formData.get("grade") ?? "").trim();
  const minPct = Number(formData.get("minPct"));
  const maxPct = Number(formData.get("maxPct"));
  const points10 = Number(formData.get("points10"));
  const isFail = formData.get("isFail") === "on";
  const sortOrder = Number(formData.get("sortOrder"));

  if (!grade || isNaN(minPct) || isNaN(maxPct) || minPct > maxPct) {
    await flashTo("/settings", "Invalid scale row — check grade name and ranges.", true);
    return;
  }

  const values = { grade, minPct, maxPct, points10, isFail, sortOrder };
  if (id > 0) {
    await db.update(gradingScale).set(values).where(eq(gradingScale.id, id));
  } else {
    await db.insert(gradingScale).values(values);
  }

  await logAudit(
    user.id,
    "Updated grading scale",
    "gradingScale",
    undefined,
    `${grade}: ${minPct}-${maxPct}% → ${(points10 / 10).toFixed(1)}`
  );

  await flashTo(
    "/settings",
    "Grading scale updated — new results will use the revised rules."
  );
}

export default async function SettingsPage() {
  await requireRole("admin");

  const school = await getSchool();
  const scale = await db
    .select()
    .from(gradingScale)
    .orderBy(gradingScale.sortOrder);

  const logoUrl = school.logoUrl || "/images/emblem.png";

  return (
    <>
      <PageHead
        title="School Settings"
        sub="Identity, grading rules and data safety"
      />

      <div className="grid lg:grid-cols-2 gap-3.5">
        <div className="card p-5">
          <h3 className="font-bold text-sm text-ink mb-4">
            School information
          </h3>

          <form action={saveSchoolSettings} className="space-y-3.5">
            <div className="flex items-center gap-4 mb-2">
              <Image
                src={logoUrl}
                alt="School logo"
                width={56}
                height={56}
                className="w-14 h-14 rounded-full border border-line object-contain bg-white"
                unoptimized
              />

              <div className="text-xs text-muted leading-relaxed">
                The logo appears in the sidebar, login screen and printed marksheets.
              </div>
            </div>

            <Field label="School name (English)">
              <input name="name" defaultValue={school.name} className="inp" />
            </Field>

            <Field label="School name (Nepali)">
              <input
                name="nameNp"
                defaultValue={school.nameNp}
                className="inp font-deva"
              />
            </Field>

            <Field label="Address">
              <input
                name="address"
                defaultValue={school.address}
                className="inp"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact number">
                <input
                  name="contact"
                  defaultValue={school.contact}
                  className="inp"
                />
              </Field>

              <Field label="Email">
                <input
                  name="email"
                  defaultValue={school.email}
                  className="inp"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Website">
                <input
                  name="website"
                  defaultValue={school.website}
                  className="inp"
                />
              </Field>

              <Field label="Head teacher name">
                <input
                  name="principal"
                  defaultValue="Principal"
                  className="inp"
                />
              </Field>
            </div>

            <Field label="Logo URL (optional)">
              <input
                name="logoUrl"
                defaultValue={school.logoUrl ?? "/images/emblem.png"}
                className="inp"
                placeholder="/images/emblem.png"
              />
            </Field>

            <Field label="Minimum attendance % for promotion">
              <input
                name="minAttendance"
                type="number"
                min="50"
                max="100"
                defaultValue={school.minAttendance}
                className="inp"
              />
            </Field>

            <button className="btn-primary">
              <Icon name="check" className="w-4 h-4" />
              Save settings
            </button>
          </form>
        </div>

        <div className="space-y-3.5">
          <div className="card overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="font-bold text-sm text-ink">
                Nepal government grading scale
              </h3>

              <p className="text-xs text-muted mt-0.5">
                Edit ranges or grade points — used automatically for every result.
                Save each row after editing.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Min %</th>
                    <th>Max %</th>
                    <th>Points</th>
                    <th>Fail</th>
                    <th className="text-right">Save</th>
                  </tr>
                </thead>

                <tbody>
                  {scale.map((g) => (
                    <tr key={g.id}>
                      <td className="px-0">
                        <form
                          action={saveScaleRow}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={g.id}
                          />

                          <input
                            type="hidden"
                            name="sortOrder"
                            value={g.sortOrder}
                          />

                          <input
                            name="grade"
                            defaultValue={g.grade}
                            className="inp w-14 text-center font-bold"
                          />

                          <input
                            name="minPct"
                            type="number"
                            defaultValue={g.minPct}
                            className="inp w-16 text-center"
                          />

                          <input
                            name="maxPct"
                            type="number"
                            defaultValue={g.maxPct}
                            className="inp w-16 text-center"
                          />

                          <input
                            name="points10"
                            type="number"
                            step="10"
                            min="0"
                            max="40"
                            defaultValue={g.points10}
                            className="inp w-16 text-center"
                            title="Grade point × 10"
                          />

                          <input
                            type="checkbox"
                            name="isFail"
                            defaultChecked={g.isFail}
                            className="accent-danger w-4 h-4"
                            title="Failing grade"
                          />

                          <button
                            className="btn-ghost btn-sm ml-1"
                            title="Save row"
                          >
                            <Icon name="check" className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </td>

                      <td
                        colSpan={5}
                        className="text-[10px] text-muted -mt-1.5"
                      >
                        {g.isFail
                          ? "Below this band students fail the subject."
                          : `Grade point ${(g.points10 / 10).toFixed(1)} of 4.0`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-sm text-ink mb-1">
              Data backup & restore
            </h3>

            <p className="text-xs text-muted mb-3">
              Download a complete JSON backup of every table, or restore from
              a previously downloaded backup. Restoring replaces all current
              data — take a fresh backup first.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/data?op=backup" className="btn-primary">
                <Icon name="download" className="w-4 h-4" />
                Download backup
              </a>

              <RestoreForm />

              <Badge tone="gray">PostgreSQL · drizzle</Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
