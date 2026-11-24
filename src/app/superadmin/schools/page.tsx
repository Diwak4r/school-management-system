import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { schools, users } from "@/db/schema";
import {
  assignSchoolAdmin,
  createSchool,
  setSchoolApproval,
  setSchoolStatus,
  updateSchool,
} from "@/actions/platform-schools";
import { Badge, Empty, Field, FormModal, Icon, ModalCancel, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

function tone(value: string) {
  if (value === "active" || value === "approved") return "green";
  if (value === "suspended" || value === "rejected") return "red";
  if (value === "pending") return "amber";
  return "gray";
}

function SchoolFields({ school }: { school?: typeof schools.$inferSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="School name"><input name="name" required defaultValue={school?.name} className="inp" /></Field>
      <Field label="School code"><input name="code" required defaultValue={school?.code} placeholder="SJJS-002" className="inp" /></Field>
      <Field label="Name in Nepali"><input name="nameNp" defaultValue={school?.nameNp ?? ""} className="inp" /></Field>
      <Field label="Registration number"><input name="registrationNo" defaultValue={school?.registrationNo ?? ""} className="inp" /></Field>
      <Field label="Province"><input name="province" defaultValue={school?.province ?? ""} className="inp" /></Field>
      <Field label="District"><input name="district" defaultValue={school?.district ?? ""} className="inp" /></Field>
      <Field label="Municipality"><input name="municipality" defaultValue={school?.municipality ?? ""} className="inp" /></Field>
      <Field label="Ward number"><input name="wardNo" defaultValue={school?.wardNo ?? ""} className="inp" /></Field>
      <Field label="Address" className="sm:col-span-2"><input name="address" defaultValue={school?.address ?? ""} className="inp" /></Field>
      <Field label="Contact email"><input name="contactEmail" type="email" defaultValue={school?.contactEmail ?? ""} className="inp" /></Field>
      <Field label="Phone"><input name="phone" defaultValue={school?.phone ?? ""} className="inp" /></Field>
      <Field label="Principal name"><input name="principalName" defaultValue={school?.principalName ?? ""} className="inp" /></Field>
      <Field label="Logo URL" className="sm:col-span-2"><input name="logoUrl" defaultValue={school?.logoUrl ?? ""} className="inp" placeholder="/images/emblem.png" /></Field>
    </div>
  );
}

export default async function PlatformSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().toLowerCase();
  const status = String(sp.status ?? "all");

  const [allSchools, eligibleAdmins] = await Promise.all([
    db.select().from(schools).orderBy(desc(schools.createdAt)),
    db.select({ id: users.id, name: users.name, email: users.email, schoolId: users.schoolId })
      .from(users)
      .where(eq(users.role, "admin")),
  ]);

  const filtered = allSchools.filter((school) => {
    const matchesQuery =
      !q ||
      school.name.toLowerCase().includes(q) ||
      school.code.toLowerCase().includes(q) ||
      (school.district ?? "").toLowerCase().includes(q);
    const matchesStatus = status === "all" || school.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHead
        title="Schools"
        sub="Register, approve and manage every tenant on the platform."
      >
        <FormModal title="Register a school" icon="plus" label="Register school">
          <form action={createSchool} className="space-y-4">
            <SchoolFields />
            <div className="flex justify-end gap-2 pt-2">
              <ModalCancel />
              <button className="btn-primary btn-sm" type="submit">Register school</button>
            </div>
          </form>
        </FormModal>
      </PageHead>

      <form className="card grid gap-2.5 p-3.5 sm:grid-cols-[1fr_180px_auto]" method="get">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 w-4 h-4 text-muted" />
          <input name="q" defaultValue={String(sp.q ?? "")} placeholder="Search name, code or district" className="inp pl-9" />
        </div>
        <select name="status" defaultValue={status} className="inp">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="btn-ghost btn-sm" type="submit">Filter</button>
      </form>

      <section className="card overflow-hidden">
        {filtered.length === 0 ? (
          <Empty icon="cap" title="No schools found" sub="Register your first tenant or change the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[980px]">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school) => {
                  const admin = eligibleAdmins.find((u) => u.schoolId === school.id);
                  return (
                    <tr key={school.id}>
                      <td>
                        <Link href={`/superadmin/schools/${school.id}`} className="font-semibold text-forest hover:underline">
                          {school.name}
                        </Link>
                        <div className="text-xs text-muted">{school.contactEmail ?? "No contact email"}</div>
                      </td>
                      <td className="font-mono text-xs">{school.code}</td>
                      <td className="text-xs text-inksoft">
                        {[school.municipality, school.district, school.province].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td><Badge tone={tone(school.status)}>{school.status}</Badge></td>
                      <td><Badge tone={tone(school.approvalStatus)}>{school.approvalStatus}</Badge></td>
                      <td className="whitespace-nowrap text-xs text-inksoft">
                        {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(school.createdAt)}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <form action={setSchoolApproval}>
                            <input type="hidden" name="id" value={school.id} />
                            <input type="hidden" name="approval" value={school.approvalStatus === "approved" ? "pending" : "approved"} />
                            <button className="btn-ghost btn-sm" type="submit">
                              {school.approvalStatus === "approved" ? "Unapprove" : "Approve"}
                            </button>
                          </form>
                          <form action={setSchoolStatus}>
                            <input type="hidden" name="id" value={school.id} />
                            <input type="hidden" name="status" value={school.status === "suspended" ? "active" : "suspended"} />
                            <button className="btn-ghost btn-sm" type="submit">
                              {school.status === "suspended" ? "Reactivate" : "Suspend"}
                            </button>
                          </form>
                          <FormModal title={`Edit ${school.name}`} icon="edit" label="Edit" wide btnClass="btn-ghost btn-sm">
                            <form action={updateSchool} className="space-y-4">
                              <input type="hidden" name="id" value={school.id} />
                              <SchoolFields school={school} />
                              <div className="flex justify-end gap-2 pt-2">
                                <ModalCancel />
                                <button className="btn-primary btn-sm" type="submit">Save changes</button>
                              </div>
                            </form>
                          </FormModal>
                          <FormModal title={`Assign administrator · ${school.name}`} icon="shield" label={admin ? "Reassign admin" : "Assign admin"} btnClass="btn-ghost btn-sm">
                            <form action={assignSchoolAdmin} className="space-y-4">
                              <input type="hidden" name="schoolId" value={school.id} />
                              <Field label="User">
                                <select name="userId" required className="inp" defaultValue="">
                                  <option value="" disabled>Select a user</option>
                                  {eligibleAdmins.map((user) => (
                                    <option key={user.id} value={user.id}>{user.name} · {user.email}</option>
                                  ))}
                                </select>
                              </Field>
                              <p className="text-xs text-muted">The user becomes a school admin for this tenant. Their active sessions are revoked.</p>
                              <div className="flex justify-end gap-2">
                                <ModalCancel />
                                <button className="btn-primary btn-sm" type="submit">Assign</button>
                              </div>
                            </form>
                          </FormModal>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
