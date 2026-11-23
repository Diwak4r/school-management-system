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
    audience: "Small schools getting started",
    description: "The core records and daily register.",
    items: "Student records · Classes and subjects · Attendance · Basic reports",
  },
  {
    name: "Growth",
    audience: "Schools with fuller academic workflows",
    description: "Exams, fees and communication alongside the core records.",
    items: "Everything in Starter · Examinations and results · Fees and receipts · Notes and notices",
  },
  {
    name: "Institution",
    audience: "Larger schools and institutions",
    description: "A setup shaped around your institutional requirements.",
    items: "Everything in Growth · Implementation discussion · Advanced reporting · Support options",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-paper text-ink">
        <section className="marketing-wrap border-b border-line py-16 lg:py-24">
          <p className="eyebrow-dark">Plans and pricing</p>
          <h1 className="display-title mt-6 max-w-3xl">
            Pricing is a conversation, not a checkout.
          </h1>
          <p className="lede-dark">
            We discuss the quote in NPR after looking at school size, the
            modules you need and what onboarding involves. No card form, no
            hidden tier to discover later.
          </p>
        </section>

        <section className="marketing-wrap py-14">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="grid gap-5 border-t border-line py-8 md:grid-cols-[160px_1fr_auto] md:items-start"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {plan.name}
                </h2>
                <p className="mt-2 text-xs text-muted">{plan.audience}</p>
              </div>
              <div>
                <p className="text-sm leading-7 text-inksoft">
                  {plan.description}
                </p>
                <p className="mt-3 text-sm text-ink">{plan.items}</p>
                <p className="mt-3 text-xs text-muted">Custom quote · NPR</p>
              </div>
              <Link href="/contact" className="marketing-link self-start whitespace-nowrap">
                Discuss this plan <span aria-hidden="true">→</span>
              </Link>
            </div>
          ))}
          <div className="border-t border-line pt-6">
            <p className="max-w-3xl text-xs leading-6 text-muted">
              These are proposed outlines, not active subscription offers.
              Features, price, taxes, billing period and support terms are
              confirmed with each school before launch.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
