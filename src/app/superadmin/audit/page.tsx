import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { Badge, Empty, Icon, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().toLowerCase();

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      actor: users.name,
      actorEmail: users.email,
      schoolId: auditLogs.schoolId,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(250);

  const filtered = rows.filter((row) =>
    !q ||
    row.action.toLowerCase().includes(q) ||
    (row.actor ?? "").toLowerCase().includes(q) ||
    (row.entity ?? "").toLowerCase().includes(q) ||
    (row.details ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="space-y-6">
      <PageHead title="Audit logs" sub="Sensitive administrative actions across the platform." />
      <form method="get" className="card flex gap-2.5 p-3.5">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input name="q" defaultValue={String(sp.q ?? "")} placeholder="Search action, actor or entity" className="inp pl-9" />
        </div>
        <button className="btn-ghost btn-sm" type="submit">Search</button>
      </form>

      <section className="card overflow-hidden">
        {filtered.length === 0 ? <Empty icon="shield" title="No audit events found" /> : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[860px]">
              <thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Entity</th><th>School</th><th>Details</th></tr></thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-xs text-inksoft">
                      {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(row.createdAt)}
                    </td>
                    <td><Badge tone={row.action.toLowerCase().includes("delet") || row.action.toLowerCase().includes("suspend") ? "red" : "gray"}>{row.action}</Badge></td>
                    <td className="text-xs">{row.actor ?? "System"}{row.actorEmail ? <div className="text-muted">{row.actorEmail}</div> : null}</td>
                    <td className="text-xs">{row.entity ?? "—"}{row.entityId ? ` #${row.entityId}` : ""}</td>
                    <td className="text-xs">#{row.schoolId}</td>
                    <td className="max-w-[280px] truncate text-xs text-inksoft" title={row.details ?? ""}>{row.details ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
