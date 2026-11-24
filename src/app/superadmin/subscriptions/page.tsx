import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { schoolSubscriptions, schools, subscriptionPlans } from "@/db/schema";
import { assignSubscription } from "@/actions/platform";
import { Badge, Empty, Field, FormModal, Icon, ModalCancel, PageHead, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

const fmt = (value: Date | null) =>
  value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "—";
const npr = (paisa: number) => `NPR ${new Intl.NumberFormat("en-NP").format(paisa / 100)}`;

export default async function SubscriptionsPage() {
  const [rows, allSchools, allPlans, summaryResult] = await Promise.all([
    db.select({ sub: schoolSubscriptions, school: schools, plan: subscriptionPlans })
      .from(schoolSubscriptions)
      .innerJoin(schools, eq(schools.id, schoolSubscriptions.schoolId))
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, schoolSubscriptions.planId))
      .orderBy(desc(schoolSubscriptions.createdAt)),
    db.select({ id: schools.id, name: schools.name }).from(schools).orderBy(schools.name),
    db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder),
    db.execute(sql`
      select
        (select count(*) from school_subscriptions where status = 'active')::int as active,
        (select count(*) from school_subscriptions where status = 'expired' or (expires_at is not null and expires_at < now()))::int as expired,
        (select coalesce(sum(p.monthly_paisa), 0)::int from school_subscriptions s join subscription_plans p on p.id = s.plan_id where s.status = 'active')::int as mrr_paisa
    `),
  ]);

  const raw = summaryResult as unknown as { rows?: Record<string, unknown>[] };
  const summary = Array.isArray(summaryResult)
    ? ((summaryResult as unknown as Record<string, unknown>[])[0] ?? {})
    : (raw.rows?.[0] ?? {});

  return (
    <div className="space-y-6">
      <PageHead title="Subscriptions" sub="School plans, status and expiry. No payment gateway is integrated.">
        <FormModal title="Assign subscription" icon="plus" label="Assign plan">
          <form action={assignSubscription} className="space-y-4">
            <Field label="School"><select name="schoolId" required className="inp"><option value="" disabled>Select a school</option>{allSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Plan"><select name="planId" required className="inp"><option value="" disabled>Select a plan</option>{allPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Status"><select name="status" defaultValue="active" className="inp"><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option><option value="expired">Expired</option></select></Field>
            <Field label="Expires at"><input name="expiresAt" type="date" className="inp" /></Field>
            <Field label="Trial ends at"><input name="trialEndsAt" type="date" className="inp" /></Field>
            <div className="flex justify-end gap-2"><ModalCancel /><button className="btn-primary btn-sm" type="submit">Save subscription</button></div>
          </form>
        </FormModal>
      </PageHead>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active subscriptions" value={Number(summary.active ?? 0)} icon="check" />
        <Stat label="Expired subscriptions" value={Number(summary.expired ?? 0)} icon="alert" tone="amber" />
        <Stat label="Recurring plan value" value={npr(Number(summary.mrr_paisa ?? 0))} sub="From active plans, not payments" icon="chart" tone="blue" />
      </div>

      <section className="card overflow-hidden">
        {rows.length === 0 ? <Empty icon="calendar" title="No subscriptions assigned" /> : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[820px]">
              <thead><tr><th>School</th><th>Plan</th><th>Status</th><th>Started</th><th>Expires</th><th>Trial ends</th><th></th></tr></thead>
              <tbody>
                {rows.map(({ sub, school, plan }) => (
                  <tr key={sub.id}>
                    <td className="font-semibold">{school.name}</td>
                    <td>{plan.name}<div className="text-xs text-muted">{npr(plan.monthlyPaisa)}/month</div></td>
                    <td><Badge tone={sub.status === "active" ? "green" : sub.status === "expired" ? "red" : "amber"}>{sub.status}</Badge></td>
                    <td className="text-xs">{fmt(sub.startsAt)}</td>
                    <td className="text-xs">{fmt(sub.expiresAt)}</td>
                    <td className="text-xs">{fmt(sub.trialEndsAt)}</td>
                    <td>
                      <FormModal title={`Update ${school.name}`} icon="edit" label="Update" btnClass="btn-ghost btn-sm">
                        <form action={assignSubscription} className="space-y-4">
                          <input type="hidden" name="schoolId" value={school.id} />
                          <Field label="Plan"><select name="planId" defaultValue={plan.id} className="inp">{allPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                          <Field label="Status"><select name="status" defaultValue={sub.status} className="inp"><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option><option value="expired">Expired</option></select></Field>
                          <Field label="Expires at"><input name="expiresAt" type="date" defaultValue={sub.expiresAt ? sub.expiresAt.toISOString().slice(0, 10) : ""} className="inp" /></Field>
                          <Field label="Trial ends at"><input name="trialEndsAt" type="date" defaultValue={sub.trialEndsAt ? sub.trialEndsAt.toISOString().slice(0, 10) : ""} className="inp" /></Field>
                          <div className="flex justify-end gap-2"><ModalCancel /><button className="btn-primary btn-sm" type="submit">Save</button></div>
                        </form>
                      </FormModal>
                    </td>
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
