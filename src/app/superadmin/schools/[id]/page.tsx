import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, schools, students, teachers, users } from "@/db/schema";
import { Badge, Empty, Icon, PageHead } from "@/components/ui";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const schoolId = Number(id);
  if (!schoolId) notFound();

  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!school) notFound();

  const [countResult, recentUsers, recentActivity] = await Promise.all([
    db.execute(sql`
      select
        (select count(*) from users where school_id = ${schoolId})::int as users,
        (select count(*) from students where school_id = ${schoolId})::int as students,
        (select count(*) from teachers where school_id = ${schoolId})::int as teachers
    `),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastLoginAt: users.lastLoginAt })
      .from(users).where(eq(users.schoolId, schoolId)).orderBy(desc(users.createdAt)).limit(8),
    db.select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt })
      .from(auditLogs).where(eq(auditLogs.schoolId, schoolId)).orderBy(desc(auditLogs.createdAt)).limit(8),
  ]);

  const rows = countResult as unknown as { rows?: Record<string, unknown>[] };
  const counts = Array.isArray(countResult)
    ? ((countResult as unknown as Record<string, unknown>[])[0] ?? {})
    : (rows.rows?.[0] ?? {});

  return (
    <div className="space-y-6">
      <PageHead title={school.name} sub={`${school.code} · School detail`}>
        <Badge tone={school.status === "active" ? "green" : school.status === "suspended" ? "red" : "gray"}>
          {school.status}
        </Badge>
        <Badge tone={school.approvalStatus === "approved" ? "green" : school.approvalStatus === "pending" ? "amber" : "red"}>
          {school.approvalStatus}
        </Badge>
      </PageHead>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Users", value: Number(counts.users ?? 0), icon: "users" },
          { label: "Students", value: Number(counts.students ?? 0), icon: "cap" },
          { label: "Teachers", value: Number(counts.teachers ?? 0), icon: "users" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-mist text-forest">
              <Icon name={stat.icon} className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{stat.label}</div>
              <div className="text-xl font-extrabold text-ink">{stat.value}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-display text-base font-semibold text-ink">Registration details</h2>
          <dl className="mt-3 divide-y divide-linesoft text-sm">
            {[
              ["Name (Nepali)", school.nameNp],
              ["Registration number", school.registrationNo],
              ["Address", school.address],
              ["Province", school.province],
              ["District", school.district],
              ["Municipality", school.municipality],
              ["Ward", school.wardNo],
              ["Contact email", school.contactEmail],
              ["Phone", school.phone],
              ["Principal", school.principalName],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-3 py-2">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-semibold text-ink">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-lg border border-line bg-paper p-3 text-xs text-muted">
            Subscription: no billing record exists for this school yet.
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-linesoft px-4 py-3">
            <h2 className="font-display text-base font-semibold text-ink">School accounts</h2>
          </div>
          {recentUsers.length === 0 ? (
            <Empty icon="users" title="No accounts" />
          ) : (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Role</th><th>Last sign in</th></tr></thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td><div className="font-semibold">{user.name}</div><div className="text-xs text-muted">{user.email}</div></td>
                    <td><Badge>{user.role}</Badge></td>
                    <td className="text-xs text-inksoft">
                      {user.lastLoginAt ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(user.lastLoginAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-linesoft px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">Recent school activity</h2>
        </div>
        {recentActivity.length === 0 ? <Empty icon="activity" title="No activity recorded" /> : (
          <ul className="divide-y divide-linesoft">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-inksoft">{item.action}</span>
                <span className="text-xs text-muted">
                  {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
