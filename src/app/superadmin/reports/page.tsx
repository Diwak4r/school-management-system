import Link from "next/link";
import { desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, schools, schoolSubscriptions, subscriptionPlans, users } from "@/db/schema";
import { Badge, Empty, Icon, PageHead, PrintButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const fmt = (value: Date | null) =>
  value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "—";

export default async function PlatformReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const fromRaw = String(sp.from ?? "");
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? new Date(`${fromRaw}T00:00:00Z`) : null;

  const [schoolRows, userRows, subscriptionRows, activityResult] = await Promise.all([
    db.select().from(schools).orderBy(desc(schools.createdAt)),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, schoolId: users.schoolId, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)),
    db.select({ school: schools.name, plan: subscriptionPlans.name, status: schoolSubscriptions.status, expiresAt: schoolSubscriptions.expiresAt })
      .from(schoolSubscriptions)
      .innerJoin(schools, sql`${schools.id} = ${schoolSubscriptions.schoolId}`)
      .innerJoin(subscriptionPlans, sql`${subscriptionPlans.id} = ${schoolSubscriptions.planId}`)
      .orderBy(desc(schoolSubscriptions.createdAt)),
    from
      ? db.select({ id: auditLogs.id, action: auditLogs.action, schoolId: auditLogs.schoolId, createdAt: auditLogs.createdAt }).from(auditLogs).where(gte(auditLogs.createdAt, from)).orderBy(desc(auditLogs.createdAt)).limit(200)
      : db.select({ id: auditLogs.id, action: auditLogs.action, schoolId: auditLogs.schoolId, createdAt: auditLogs.createdAt }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200),
  ]);

  const exportLink = (type: string) => `/api/platform/reports?type=${type}`;

  return (
    <div className="space-y-6 print-area">
      <PageHead title="Platform reports" sub="Printable tables and CSV exports from live data.">
        <PrintButton label="Print report" />
      </PageHead>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-3.5 no-print">
        <label className="block"><span className="lbl">Activity from</span><input type="date" name="from" defaultValue={fromRaw} className="inp" /></label>
        <button className="btn-ghost btn-sm" type="submit">Apply</button>
        <div className="ml-auto flex flex-wrap gap-2">
          {(["schools", "users", "subscriptions", "activity"] as const).map((type) => (
            <Link key={type} className="btn-ghost btn-sm" href={exportLink(type)}>
              <Icon name="download" className="h-3.5 w-3.5" /> {type}
            </Link>
          ))}
        </div>
      </form>

      <section className="card overflow-hidden">
        <div className="border-b border-linesoft px-4 py-3"><h2 className="font-display text-base font-semibold">School registration report</h2></div>
        {schoolRows.length === 0 ? <Empty icon="cap" title="No schools" /> : (
          <table className="tbl"><thead><tr><th>School</th><th>Code</th><th>Location</th><th>Status</th><th>Registered</th></tr></thead><tbody>
            {schoolRows.map((row) => <tr key={row.id}><td className="font-semibold">{row.name}</td><td className="font-mono text-xs">{row.code}</td><td className="text-xs">{[row.municipality, row.district].filter(Boolean).join(", ") || "—"}</td><td><Badge tone={row.status === "active" ? "green" : "gray"}>{row.status}</Badge></td><td className="text-xs">{fmt(row.createdAt)}</td></tr>)}
          </tbody></table>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-linesoft px-4 py-3"><h2 className="font-display text-base font-semibold">User activity report</h2></div>
        {activityResult.length === 0 ? <Empty icon="activity" title="No activity in this range" /> : (
          <table className="tbl"><thead><tr><th>When</th><th>Action</th><th>School</th></tr></thead><tbody>
            {activityResult.map((row) => <tr key={row.id}><td className="text-xs">{fmt(row.createdAt)}</td><td>{row.action}</td><td className="text-xs">#{row.schoolId}</td></tr>)}
          </tbody></table>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-linesoft px-4 py-3"><h2 className="font-display text-base font-semibold">Subscription report</h2></div>
          {subscriptionRows.length === 0 ? <Empty icon="calendar" title="No subscriptions" /> : (
            <table className="tbl"><thead><tr><th>School</th><th>Plan</th><th>Status</th><th>Expires</th></tr></thead><tbody>
              {subscriptionRows.map((row, i) => <tr key={i}><td>{row.school}</td><td>{row.plan}</td><td><Badge tone={row.status === "active" ? "green" : "amber"}>{row.status}</Badge></td><td className="text-xs">{fmt(row.expiresAt)}</td></tr>)}
            </tbody></table>
          )}
        </section>
        <section className="card overflow-hidden">
          <div className="border-b border-linesoft px-4 py-3"><h2 className="font-display text-base font-semibold">Recent registrations</h2></div>
          <table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>School</th><th>Created</th></tr></thead><tbody>
            {userRows.slice(0, 20).map((row) => <tr key={row.id}><td>{row.name}<div className="text-xs text-muted">{row.email}</div></td><td><Badge>{row.role}</Badge></td><td className="text-xs">#{row.schoolId}</td><td className="text-xs">{fmt(row.createdAt)}</td></tr>)}
          </tbody></table>
        </section>
      </div>
    </div>
  );
}
