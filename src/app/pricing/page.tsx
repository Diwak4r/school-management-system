import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

export const metadata: Metadata = {
  title: "Pricing | ShikshaSetu",
  description: "Discuss a school management subscription plan for your school.",
};

const plans = [
  {
    name: "Starter",
    audience: "For small schools getting started",
    description: "Core tools for organizing everyday school administration.",
    items: ["Student records", "Class and subject management", "Attendance", "Basic academic reports"],
  },
  {
    name: "Growth",
    audience: "For growing schools",
    description: "A broader set of tools for academic and administrative workflows.",
    items: ["Everything in Starter", "Examinations and results", "Fee and receipt management", "Notices and learning notes"],
    featured: true,
  },
  {
    name: "Institution",
    audience: "For larger institutions",
    description: "A tailored setup based on institutional requirements.",
    items: ["Everything in Growth", "Implementation discussion", "Advanced reporting needs", "Priority support options"],
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-slate-950 px-5 py-20 text-center text-white lg:py-24">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Plans and pricing</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">A plan that fits your school.</h1>
          <p className="mx-auto mt-6 max-w-2xl leading-8 text-slate-300">
            We are shaping subscription options for schools in Nepal. Final pricing in NPR will depend on school size, modules and onboarding requirements.
          </p>
        </section>
        <section className="bg-slate-50 px-5 py-20">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className={`rounded-3xl border bg-white p-8 shadow-sm ${plan.featured ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                {plan.featured && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">Popular option</span>}
                <h2 className="mt-5 text-2xl font-black text-slate-900">{plan.name}</h2>
                <p className="mt-2 text-sm font-semibold text-emerald-700">{plan.audience}</p>
                <p className="mt-4 min-h-14 text-sm leading-6 text-slate-600">{plan.description}</p>
                <div className="mt-7 border-y border-slate-100 py-5">
                  <div className="text-2xl font-black text-slate-900">Custom quote</div>
                  <div className="mt-1 text-xs text-slate-500">Pricing discussed in NPR</div>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-slate-700">
                      <span className="font-black text-emerald-600">✓</span>{item}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={`mt-8 block rounded-xl px-5 py-3 text-center text-sm font-extrabold ${plan.featured ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}>
                  Discuss this plan
                </Link>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-slate-500">
            These are proposed plan outlines, not active subscription offers. Features, prices, taxes, billing periods and support terms must be confirmed before launch.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
