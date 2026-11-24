import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { savePlan, togglePlan } from "@/actions/platform";
import { Badge, Empty, Field, FormModal, ModalCancel, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

const npr = (paisa: number) =>
  `NPR ${new Intl.NumberFormat("en-NP").format(paisa / 100)}`;

function PlanFields({ plan }: { plan?: typeof subscriptionPlans.$inferSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Plan name"><input name="name" required defaultValue={plan?.name} className="inp" /></Field>
      <Field label="Slug"><input name="slug" required defaultValue={plan?.slug} className="inp" /></Field>
      <Field label="Monthly price (NPR)"><input name="monthlyNpr" type="number" min="0" step="1" defaultValue={plan ? plan.monthlyPaisa / 100 : 0} className="inp" /></Field>
      <Field label="Annual price (NPR)"><input name="annualNpr" type="number" min="0" step="1" defaultValue={plan ? plan.annualPaisa / 100 : 0} className="inp" /></Field>
      <Field label="Student limit"><input name="studentLimit" type="number" min="1" defaultValue={plan?.studentLimit ?? ""} className="inp" placeholder="Unlimited" /></Field>
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 0} className="inp" /></Field>
      <Field label="Description" className="sm:col-span-2"><input name="description" defaultValue={plan?.description ?? ""} className="inp" /></Field>
      <Field label="Features (one per line)" className="sm:col-span-2">
        <textarea name="features" rows={4} defaultValue={plan?.features ?? ""} className="inp" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-inksoft sm:col-span-2">
        <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} className="h-4 w-4 accent-forest" />
        Active
      </label>
    </div>
  );
}

export default async function PlansPage() {
  const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder));

  return (
    <div className="space-y-6">
      <PageHead title="Plans" sub="Prices are stored in paisa and shown in NPR.">
        <FormModal title="Create plan" icon="plus" label="Create plan">
          <form action={savePlan} className="space-y-4">
            <PlanFields />
            <div className="flex justify-end gap-2"><ModalCancel /><button className="btn-primary btn-sm" type="submit">Create plan</button></div>
          </form>
        </FormModal>
      </PageHead>

      {plans.length === 0 ? <section className="card"><Empty icon="file" title="No plans yet" /></section> : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <section key={plan.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">{plan.name}</h2>
                  <p className="text-xs text-muted">{plan.slug} · {plan.studentLimit ? `${plan.studentLimit} students` : "Unlimited students"}</p>
                </div>
                <Badge tone={plan.isActive ? "green" : "gray"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="mt-3 text-sm text-inksoft">{plan.description ?? "No description"}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-y border-linesoft py-3">
                <div><div className="text-[11px] font-bold uppercase tracking-wide text-muted">Monthly</div><div className="font-bold text-ink">{npr(plan.monthlyPaisa)}</div></div>
                <div><div className="text-[11px] font-bold uppercase tracking-wide text-muted">Annual</div><div className="font-bold text-ink">{npr(plan.annualPaisa)}</div></div>
              </div>
              {plan.features && <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-6 text-inksoft">{plan.features}</pre>}
              <div className="mt-4 flex gap-2">
                <FormModal title={`Edit ${plan.name}`} icon="edit" label="Edit" btnClass="btn-ghost btn-sm" wide>
                  <form action={savePlan} className="space-y-4">
                    <input type="hidden" name="id" value={plan.id} />
                    <PlanFields plan={plan} />
                    <div className="flex justify-end gap-2"><ModalCancel /><button className="btn-primary btn-sm" type="submit">Save plan</button></div>
                  </form>
                </FormModal>
                <form action={togglePlan}>
                  <input type="hidden" name="id" value={plan.id} />
                  <input type="hidden" name="isActive" value={String(!plan.isActive)} />
                  <button className="btn-ghost btn-sm" type="submit">{plan.isActive ? "Deactivate" : "Activate"}</button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
