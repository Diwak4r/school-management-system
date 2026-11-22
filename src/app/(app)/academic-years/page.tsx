import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { academicYears, enrollments, examinations } from "@/db/schema";
import { requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { PageHead, Badge, FormModal, ModalCancel, Field, ConfirmButton, Icon, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function addYear(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) await flashTo("/academic-years", "Year name is required (e.g. 2083/2084).", true);
  const exists = await db.select().from(academicYears).where(eq(academicYears.name, name)).limit(1);
  if (exists.length > 0) await flashTo("/academic-years", `${name} already exists.`, true);
  await db.insert(academicYears).values({ name, status: "archived" });
  await logAudit(user.id, "Created academic year", "year", undefined, name);
  await flashTo("/academic-years", `${name} created (archived until activated).`);
}

export async function setActiveYear(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1);
  await db.update(academicYears).set({ status: "archived" }).where(sql`status = 'active'`);
  await db.update(academicYears).set({ status: "active" }).where(eq(academicYears.id, id));
  await logAudit(user.id, "Set active academic year", "year", id, row?.name);
  await flashTo("/academic-years", `${row?.name} is now the active academic year.`);
}

export async function archiveYear(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1);
  if (!row) return;
  const count = await db.select({ c: sql<number>`count(*)::int` }).from(enrollments).where(eq(enrollments.academicYearId, id));
  if (row.status === "active") {
    await flashTo("/academic-years", "Archive the current active year only after promoting students to the next year.", true);
    return;
  }
  await db.update(academicYears).set({ status: "archived" }).where(eq(academicYears.id, id));
  await logAudit(user.id, "Archived academic year", "year", id, `${row.name} (${count[0].c} enrolments preserved)`);
  await flashTo("/academic-years", `${row.name} archived. All ${count[0].c} records preserved for history.`);
}

export default async function AcademicYearsPage() {
  await requireRole("admin");
  const [yearsList, enrRows, examRows] = await Promise.all([
    db.select().from(academicYears).orderBy(desc(academicYears.id)),
    db.select({ yearId: enrollments.academicYearId, status: enrollments.status }).from(enrollments),
    db.select({ yearId: examinations.academicYearId }).from(examinations),
  ]);
  const years = yearsList.map((y) => ({
    y,
    students: enrRows.filter((e) => e.yearId === y.id && e.status === "active").length,
    exams: examRows.filter((e) => e.yearId === y.id).length,
  }));

  return (
    <>
      <PageHead title="Academic Years" sub="Manage fiscal years — historical data is never deleted">
        <FormModal title="Create academic year" icon="plus" label="New year">
          <form action={addYear} className="space-y-4">
            <Field label="Year (Nepali fiscal) *">
              <input name="name" placeholder="e.g. 2083/2084" required className="inp" />
            </Field>
            <p className="text-xs text-muted">The year is created as archived. Activate it when you are ready, and it will replace the current active year.</p>
            <div className="flex justify-end gap-2">
              <ModalCancel />
              <button className="btn-primary"><Icon name="check" className="w-4 h-4" /> Create</button>
            </div>
          </form>
        </FormModal>
      </PageHead>

      <div className="card overflow-hidden">
        {years.length === 0 ? (
          <Empty icon="calendar" title="No academic years yet" sub="Create your first academic year." />
        ) : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead>
              <tr><th>Year</th><th>Status</th><th>Active students</th><th>Examinations</th><th>Created</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {years.map(({ y, students, exams }) => (
                <tr key={y.id} className={y.status === "active" ? "bg-forest-mist/40" : ""}>
                  <td className="font-bold">{y.name}</td>
                  <td>
                    {y.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Archived</Badge>}
                  </td>
                  <td>{students}</td>
                  <td>{exams}</td>
                  <td className="text-muted text-xs">{new Date(y.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="text-right whitespace-nowrap">
                    {y.status !== "active" && (
                      <>
                        <form action={setActiveYear} className="inline">
                          <input type="hidden" name="id" value={y.id} />
                          <button className="btn-primary btn-sm mr-1"><Icon name="check" className="w-3.5 h-3.5" /> Set active</button>
                        </form>
                      </>
                    )}
                    {y.status !== "active" && students > 0 && (
                      <ConfirmButton action={archiveYear} icon="database" label="Archive" title="Archive" className="btn-ghost btn-sm" message={`Archive ${y.name}? Its ${students} enrolments and all results will remain available as history.`} confirmText="Archive" fields={[{ name: "id", value: String(y.id) }]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="card p-4 mt-3.5 flex items-start gap-3 border-saffron/40 bg-saffron-soft/50">
        <Icon name="shield" className="w-4.5 h-4.5 text-saffron-dark shrink-0 mt-0.5" />
        <p className="text-sm text-inksoft">
          <span className="font-bold">History is protected.</span> Switching or archiving a year never removes enrolments, attendance,
          or results — historical records stay linked to each academic year and remain visible in student academic history and reports.
        </p>
      </div>
    </>
  );
}
