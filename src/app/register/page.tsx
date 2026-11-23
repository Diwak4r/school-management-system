import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

export const metadata: Metadata = {
  title: "School Onboarding | ShikshaSetu",
  description: "Learn how schools can prepare for ShikshaSetu onboarding.",
};

const steps = [
  ["01", "School information", "School name, address, contact details and basic institutional information."],
  ["02", "Requirement discussion", "The modules, user roles and workflows your school actually uses."],
  ["03", "Secure setup", "A separate school environment and authorised administrator access."],
  ["04", "Training and launch", "Review the setup, train the people who use it and agree a launch date."],
];

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-paper text-ink">
        <section className="marketing-wrap border-b border-line py-16 lg:py-24">
          <p className="eyebrow-dark">School onboarding</p>
          <h1 className="display-title mt-6 max-w-3xl">
            Bring your school onto ShikshaSetu.
          </h1>
          <p className="lede-dark">
            Registration is being prepared carefully. This page explains the
            steps so your school can gather what it needs in advance.
          </p>
        </section>

        <section className="marketing-wrap py-16">
          <h2 className="section-title text-2xl">How onboarding will work</h2>
          <div className="mt-10 border-t border-line">
            {steps.map(([number, title, description]) => (
              <div
                key={number}
                className="grid gap-4 border-b border-line py-7 md:grid-cols-[64px_1fr_1.3fr] md:items-baseline"
              >
                <span className="font-display text-sm text-saffron-dark">
                  {number}
                </span>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="text-sm leading-7 text-inksoft">{description}</p>
              </div>
            ))}
          </div>

          <div className="paper-card mt-10 flex flex-col gap-6 px-8 py-9 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold">
                Registration is not open yet.
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-inksoft">
                This page does not create an account, activate a subscription
                or grant administrator access.
              </p>
            </div>
            <Link href="/contact" className="marketing-btn self-start">
              Discuss onboarding <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
