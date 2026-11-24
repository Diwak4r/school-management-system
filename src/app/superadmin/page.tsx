import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, schools, sessions, settings, users } from "@/db/schema";
import { Avatar, Badge, Empty, Icon, PageHead, Stat } from "@/components/ui";
import { DEFAULT_SCHOOL } from "@/lib/grading";
import { getPlatformAdminUser } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

const number = (value: unknown) => Number(value ?? 0);

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const roleTone: Record<string, string> = {
  admin: "green",
  teacher: "blue",
  student: "amber",
  parent: "gray",
};

export default async function SuperAdminOverview() {
  const [countResult, recentUsers, recentActivity, settingRows, schoolRows, owner] =
    await Promise.all([
      db.execute(sql`
        select
          (select count(*) from schools)::int as schools,
          (select count(*) from schools where status = 'active')::int as active_schools,
          (select count(*) from schools where status <> 'active')::int as inactive_schools,
          (select count(*) from schools where approval_status = 'pending')::int as pending_schools,
          (select count(*) from users)::int as total_users,
          (select count(*) from users where role = 'admin')::int as admins,
          (select count(*) from users where role = 'teacher')::int as teachers,
          (select count(*) from users where role = 'student')::int as students,
          (select count(*) from users where role = 'parent')::int as parents,
          (select count(*) from students)::int as student_records,
          (select count(*) from teachers)::int as teacher_records,
          (select count(*) from audit_logs where created_at >= now() - interval '7 days')::int as activity_7d,
          (select count(*) from sessions where expires_at > now())::int as active_sessions
      `),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(6),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          createdAt: auditLogs.createdAt,
          actor: users.name,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(8),
      db.select().from(settings),
      db.select().from(schools),
      getPlatformAdminUser(),
    ]);

  const rawRows = countResult as unknown as { rows?: Record<string, unknown>[] };
  const counts = Array.isArray(countResult)
    ? ((countResult as unknown as Record<string, unknown>[])[0] ?? {})
    : (rawRows.rows?.[0] ?? {});

  const settingMap = Object.fromEntries(
    settingRows.map((row) => [row.key, row.value ?? ""]),
  );
  const currentSchool =
    schoolRows.find((school) => school.id === owner?.schoolId) ?? schoolRows[0];
  const schoolName = currentSchool?.name || settingMap["school_name"] || DEFAULT_SCHOOL.name;
  const schoolAddress = currentSchool?.address || settingMap["school_address"] || DEFAULT_SCHOOL.address;
  const schoolEmail = currentSchool?.contactEmail || settingMap["school_email"] || DEFAULT_SCHOOL.email;
  const schoolContact = currentSchool?.phone || settingMap["school_contact"] || DEFAULT_SCHOOL.contact;
  const principal = currentSchool?.principalName || settingMap["principal_name"] || "Not recorded";

  const roleBreakdown = [
    { label: "School admins", value: number(counts.admins), tone: "bg-forest" },
    { label: "Teachers", value: number(counts.teachers), tone: "bg-info" },
    { label: "Students", value: number(counts.students), tone: "bg-saffron" },
    { label: "Parents", value: number(counts.parents), tone: "bg-muted" },
  ];
  const roleTotal = roleBreakdown.reduce((sum, r) => sum + r.value, 0) || 1;

  return (
    <div className="space-y-7">
      <PageHead
        title="Platform overview"
        sub={`Signed in as the platform owner${owner ? `, ${owner.name}` : ""}. All figures below are read from the live database.`}
      >
        <Badge tone="green">
          <Icon name="shield" className="w-3 h-3" /> Platform owner
        </Badge>
      </PageHead>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
          <Icon name="cap" className="w-4 h-4" /> Schools
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Registered schools" value={number(counts.schools)} sub="Tenant registry" icon="cap" />
          <Stat label="Active schools" value={number(counts.active_schools)} sub="Approved and serving" icon="check" />
          <Stat label="Inactive or suspended" value={number(counts.inactive_schools)} sub="Not serving records" icon="lock" tone="amber" />
          <Stat label="Pending approvals" value={number(counts.pending_schools)} sub="Awaiting platform review" icon="clock" tone="amber" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
          <Icon name="users" className="w-4 h-4" /> People
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Students" value={number(counts.student_records)} sub="Across the current school" icon="cap" />
          <Stat label="Teachers" value={number(counts.teacher_records)} sub="Staff records" icon="users" tone="blue" />
          <Stat label="School administrators" value={number(counts.admins)} sub="Admin role accounts" icon="shield" />
          <Stat label="Total platform users" value={number(counts.total_users)} sub="All roles" icon="database" tone="amber" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
          <Icon name="calendar" className="w-4 h-4" /> Subscriptions
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active subscriptions" value="—" sub="No billing records yet" icon="check" tone="blue" />
          <Stat label="Expired subscriptions" value="—" sub="No billing records yet" icon="alert" tone="amber" />
          <Stat label="Monthly recurring revenue" value="—" sub="Payment gateway not integrated" icon="chart" tone="amber" />
          <Stat label="Active sessions" value={number(counts.active_sessions)} sub="Valid sessions right now" icon="clock" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-linesoft px-4 py-3">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Recent registrations</h2>
              <p className="text-xs text-muted">Newest accounts first</p>
            </div>
            <Link href="/users" className="btn-ghost btn-sm">
              All users <Icon name="arrow" className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <Empty icon="users" title="No accounts yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl min-w-[620px]">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Last sign in</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={user.name} className="w-8 h-8 text-[11px]" />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink">{user.name}</div>
                            <div className="truncate text-xs text-muted">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={roleTone[user.role] ?? "gray"}>{user.role}</Badge></td>
                      <td className="whitespace-nowrap text-xs text-inksoft">{formatDate(user.createdAt)}</td>
                      <td className="whitespace-nowrap text-xs text-inksoft">{formatDate(user.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="card p-4">
            <h2 className="font-display text-base font-semibold text-ink">Users by role</h2>
            <p className="mt-0.5 text-xs text-muted">Current platform accounts</p>
            <div className="mt-4 space-y-3">
              {roleBreakdown.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-inksoft">{row.label}</span>
                    <span className="font-bold text-ink">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-linesoft">
                    <div
                      className={`h-full rounded-full ${row.tone}`}
                      style={{ width: `${(row.value / roleTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-linesoft pt-3 text-xs text-muted">
              <span>Activity in the last 7 days</span>
              <span className="font-bold text-ink">{number(counts.activity_7d)} events</span>
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-display text-base font-semibold text-ink">Current school</h2>
            <p className="mt-0.5 text-xs text-muted">Loaded from the tenant registry</p>
            <dl className="mt-4 divide-y divide-linesoft text-sm">
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted">Name</dt><dd className="text-right font-semibold text-ink">{schoolName}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted">Principal</dt><dd className="text-right font-semibold text-ink">{principal}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted">Address</dt><dd className="text-right font-semibold text-ink">{schoolAddress}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted">Contact</dt><dd className="text-right font-semibold text-ink">{schoolContact}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted">Email</dt><dd className="text-right font-semibold text-ink">{schoolEmail}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-linesoft px-4 py-3">
            <h2 className="font-display text-base font-semibold text-ink">Recent administrative activity</h2>
            <p className="text-xs text-muted">Latest events from the audit log</p>
          </div>
          {recentActivity.length === 0 ? (
            <Empty icon="activity" title="No activity recorded" />
          ) : (
            <ul className="divide-y divide-linesoft">
              {recentActivity.map((event) => (
                <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-mist text-forest">
                    <Icon name="shield" className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{event.action}</div>
                    <div className="truncate text-xs text-muted">
                      {event.actor ?? "System"}
                      {event.entity ? ` · ${event.entity}` : ""}
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-muted">{formatDate(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-display text-base font-semibold text-ink">Platform readiness</h2>
          <p className="mt-0.5 text-xs text-muted">Status is derived from the current schema and configuration</p>
          <ul className="mt-4 divide-y divide-linesoft text-sm">
            <li className="flex items-center justify-between gap-3 py-3">
              <span>Platform owner access</span><Badge tone="green">Enabled</Badge>
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span>Existing school records</span><Badge tone="green">Preserved</Badge>
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span>Tenant registry</span><Badge tone="green">Active</Badge>
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span>Subscription billing</span><Badge tone="gray">Not integrated</Badge>
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            The tenant migration needs a reviewed backfill of existing records. It has not been applied automatically.
          </p>
        </section>
      </div>
    </div>
  );
}
