import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { teachers, classSubjects } from "@/db/schema";
import { requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { PageHead, Badge, FormModal, ModalCancel, Field, ConfirmButton, Icon, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function saveTeacher(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const name = String(formData.get("name") ?? "").trim();
  const employeeNo = String(formData.get("employeeNo") ?? "").trim();
  if (!name) await flashTo("/teachers", "Teacher name is required.", true);
  if (!employeeNo) await flashTo("/teachers", "Employee no. is required.", true);
  const dup = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(id ? and(eq(teachers.employeeNo, employeeNo), sql`${teachers.id} != ${id}`) : eq(teachers.employeeNo, employeeNo))
    .limit(1);
  if (dup.length > 0) await flashTo("/teachers", `Employee no. ${employeeNo} is already in use.`, true);

  const data = {
    name,
    employeeNo,
    dob: s(formData.get("dob")),
    gender: s(formData.get("gender")),
    phone: s(formData.get("phone")),
    email: s(formData.get("email")),
    qualification: s(formData.get("qualification")),
    address: s(formData.get("address")),
    joinDate: s(formData.get("joinDate")) ?? new Date().toISOString().slice(0, 10),
  };
  let tid = id;
  if (id) {
    await db.update(teachers).set(data).where(eq(teachers.id, id));
  } else {
    const [row] = await db.insert(teachers).values(data).returning({ id: teachers.id });
    tid = row.id;
  }
  await logAudit(user.id, id ? "Updated teacher" : "Added teacher", "teacher", tid ?? undefined, name);
  await flashTo("/teachers", id ? "Teacher record updated." : `${name} added to staff.`);
}

export async function deleteTeacher(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  await db.update(teachers).set({ status: "inactive" }).where(eq(teachers.id, id));
  await logAudit(user.id, "Deactivated teacher", "teacher", id, row?.name);
  await flashTo("/teachers", "Teacher deactivated (records preserved).");
}

export async function reactivateTeacher(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const id = Number(formData.get("id"));
  await db.update(teachers).set({ status: "active" }).where(eq(teachers.id, id));
  await logAudit(user.id, "Reactivated teacher", "teacher", id);
  await flashTo("/teachers", "Teacher re-activated.");
}

function s(v: FormDataEntryValue | null) {
  const str = String(v ?? "").trim();
  return str ? str : null;
}

export default async function TeachersPage() {
  const user = await requireRole("admin");
  const rows = await db
    .select({
      t: teachers,
      classesCount: sql<number>`(select count(*) from class_subjects where class_subjects.teacher_id = ${teachers.id})::int`,
    })
    .from(teachers)
    .orderBy(teachers.name);

  return (
    <>
      <PageHead title="Teachers & Staff" sub={`${rows.length} staff members`}>
        <FormModal title="Add teacher" icon="plus" label="Add teacher" wide>
          <TeacherForm />
        </FormModal>
      </PageHead>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon="users" title="No teachers yet" sub="Add your first teacher to start assigning subjects." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[820px]">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Employee No.</th>
                  <th>Phone</th>
                  <th>Qualification</th>
                  <th>Subjects</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ t, classesCount }) => (
                  <tr key={t.id} className={t.status !== "active" ? "opacity-60" : ""}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-info-soft text-info font-bold text-xs flex items-center justify-center shrink-0">{t.name[0]}</span>
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-[11px] text-muted">{t.email ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-inksoft">{t.employeeNo}</td>
                    <td className="text-inksoft">{t.phone ?? "—"}</td>
                    <td className="text-inksoft">{t.qualification ?? "—"}</td>
                    <td>{classesCount > 0 ? <Badge tone="blue">{classesCount} assigned</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="text-muted text-xs">{t.joinDate ? new Date(t.joinDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td>{t.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}</td>
                    <td className="text-right whitespace-nowrap">
                      <FormModal title={`Edit — ${t.name}`} btnClass="btn-ghost btn-sm" icon="edit" label="Edit" wide>
                        <TeacherForm teacher={t} />
                      </FormModal>
                      <span className="inline-block w-1" />
                      {t.status === "active" ? (
                        <ConfirmButton action={deleteTeacher} icon="x" label="Deactivate" message={`Deactivate ${t.name}? Their class and subject assignments will be unassigned.`} confirmText="Deactivate" fields={[{ name: "id", value: String(t.id) }]} />
                      ) : (
                        <form action={reactivateTeacher} className="inline">
                          <input type="hidden" name="id" value={t.id} />
                          <button className="btn-ghost btn-sm">Reactivate</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function TeacherForm({ teacher }: { teacher?: any }) {
  return (
    <form action={saveTeacher} className="grid grid-cols-2 gap-3.5">
      {teacher && <input type="hidden" name="id" value={teacher.id} />}
      <Field label="Full name *" className="col-span-2">
        <input name="name" defaultValue={teacher?.name ?? ""} required className="inp" />
      </Field>
      <Field label="Employee no. *">
        <input name="employeeNo" defaultValue={teacher?.employeeNo ?? ""} required className="inp font-mono" />
      </Field>
      <Field label="Date of birth">
        <input name="dob" type="date" defaultValue={teacher?.dob ?? ""} className="inp" />
      </Field>
      <Field label="Gender">
        <select name="gender" defaultValue={teacher?.gender ?? ""} className="inp">
          <option value="">—</option>
          <option>Female</option>
          <option>Male</option>
        </select>
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={teacher?.phone ?? ""} className="inp" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={teacher?.email ?? ""} className="inp" />
      </Field>
      <Field label="Qualification">
        <input name="qualification" defaultValue={teacher?.qualification ?? ""} placeholder="B.Ed, M.Ed…" className="inp" />
      </Field>
      <Field label="Joining date">
        <input name="joinDate" type="date" defaultValue={teacher?.joinDate ?? new Date().toISOString().slice(0, 10)} className="inp" />
      </Field>
      <Field label="Address" className="col-span-2">
        <input name="address" defaultValue={teacher?.address ?? ""} className="inp" />
      </Field>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <ModalCancel />
        <button type="submit" className="btn-primary">
          <Icon name="check" className="w-4 h-4" /> Save teacher
        </button>
      </div>
    </form>
  );
}
