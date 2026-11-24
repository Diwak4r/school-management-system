import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, schools, students, users } from "@/db/schema";
import { Badge, Empty, Icon, PageHead, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

const number = (value: unknown) => Number(value ?? 0);
const formatMonth = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(new Date(`${value}-01T00:00:00Z`));

export default async function PlatformAnalyticsPage() {
  const [summaryResult, growthResult, schoolRows, roleResult] = await Promise.all([
    db.execute(sql`
      select
        (select count(*) from schools)::int as schools,
        (select count(*) from users)::int as users,
        (select count(*) from students)::int as students,
        (select count(*) from audit_logs where created_at >= now() - interval '30 days')::int as activity_30d
    `),
    db.execute(sql`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*)::int as total
      from schools group by 1 order by 1 desc limit 12
    `),
    db.select({
      id: schools.id,
      name: schools.name,
      status: schools.status,
      students: sql<number>`(select count(*) from students where school_id = ${schools.id})::int`,
      users: sql<number>`(select count(*) from users where school_id = ${schools.id})::int`,
    }).from(schools).orderBy(desc(schools.createdAt)).limit(10),
    db.select({ role: users.role, total: sql<number>`count(*)::int` }).from(users).groupBy(users.role),
  ]);

  const rowsOf = (result: unknown) => {
    const raw = result as { rows?: Record<string, unknown>[] };
    return Array.isArray(result) ? (result as Record<string, unknown>[]) : (raw.rows ?? []);
  };
  const summary = rowsOf(summaryResult)[0] ?? {};
  const growth = rowsOf(growthResult);
  const maxGrowth = Math.max(1, ...growth.map((row) => number(row.total)));
  const maxStudents = Math.max(1, ...schoolRows.map((row) => number(row.students)));

  return (
    <div className="space-y-6">
      <PageHead title="Analytics" sub="Platform-wide figures computed from live tables." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Schools" value={number(summary.schools)} icon="cap" />
        <Stat label="Users" value={number(summary.users)} icon="users" tone="blue" />
        <Stat label="Students" value={number(summary.students)} icon="users" tone="amber" />
        <Stat label="Events · 30 days" value={number(summary.activity_30d)} icon="activity" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-base font-semibold text-ink">School registrations</h2>
          <p className="text-xs text-muted">Last 12 months with registrations</p>
          {growth.length === 0 ? <Empty icon="chart" title="No registration data" /> : (
            <div className="mt-5 space-y-3">
              {growth.map((row) => (
                <div key={String(row.month)}>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-inksoft">{formatMonth(String(row.month))}</span><span className="font-bold">{number(row.total)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-linesoft"><div className="h-full rounded-full bg-forest" style={{ width: `${(number(row.total) / maxGrowth) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-base font-semibold text-ink">Students by school</h2>
          <p className="text-xs text-muted">Enrolled student records per tenant</p>
          <div className="mt-5 space-y-3">
            {schoolRows.map((school) => (
              <div key={school.id}>
                <div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate text-inksoft">{school.name}</span><span className="font-bold">{number(school.students)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-linesoft"><div className="h-full rounded-full bg-info" style={{ width: `${(number(school.students) / maxStudents) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-base font-semibold text-ink">Users by role</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {roleResult.map((row) => <Badge key={row.role} tone="blue">{row.role}: {number(row.total)}</Badge>)}
          {roleResult.length === 0 && <p className="text-sm text-muted"><Icon name="users" className="mr-1 inline h-4 w-4" />No users.</p>}
        </div>
      </section>
    </div>
  );
}
