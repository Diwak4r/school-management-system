import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/grading";
import { PageHead, Icon, Empty, Avatar } from "@/components/ui";

export const dynamic = "force-dynamic";

const iconFor = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("login")) return "lock";
  if (a.includes("student") || a.includes("promot")) return "cap";
  if (a.includes("teacher")) return "users";
  if (a.includes("attend")) return "clipboard";
  if (a.includes("mark") || a.includes("exam") || a.includes("publish")) return "file";
  if (a.includes("notice")) return "bell";
  if (a.includes("note")) return "folder";
  if (a.includes("section") || a.includes("subject") || a.includes("class")) return "book";
  if (a.includes("year")) return "calendar";
  return "activity";
};

export default async function ActivityPage() {
  await requireRole("admin");
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      details: auditLogs.details,
      at: auditLogs.createdAt,
      name: users.name,
      userId: auditLogs.userId,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(120);

  return (
    <>
      <PageHead title="Activity Log" sub="Audit trail of important administrative actions" />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon="activity" title="No activity yet" sub="Actions such as admissions, mark entry and publishing will be recorded here." />
        ) : (
          <div className="divide-y divide-linesoft">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-8 h-8 rounded-lg bg-forest-mist text-forest flex items-center justify-center shrink-0">
                  <Icon name={iconFor(r.action)} className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-bold text-ink">{r.name ?? "System"}</span>
                    <span className="text-inksoft"> {r.action}</span>
                    {r.entity && <span className="text-muted text-xs"> · {r.entity}</span>}
                  </div>
                  {r.details && <div className="text-xs text-muted truncate">{r.details}</div>}
                </div>
                <span className="text-[11px] text-muted whitespace-nowrap">{fmtDate(r.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
