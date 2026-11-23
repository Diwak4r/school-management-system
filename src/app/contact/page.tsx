import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

export const metadata: Metadata = {
  title: "Contact | ShikshaSetu",
  description: "Contact ShikshaSetu to discuss a school management platform demonstration.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-paper text-ink">
        <section className="marketing-wrap border-b border-line py-16 lg:py-24">
          <p className="eyebrow-dark">Contact</p>
          <h1 className="display-title mt-6 max-w-3xl">
            Let us talk about your school.
          </h1>
          <p className="lede-dark">
            Tell us how your office keeps records today and we will show you
            what changes when they live in one place.
          </p>
        </section>

        <section className="marketing-wrap grid gap-12 py-16 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="section-title text-2xl">What we can discuss</h2>
            <div className="mt-8 border-t border-line">
              <div className="grid gap-3 border-b border-line py-6 sm:grid-cols-[150px_1fr]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  School onboarding
                </p>
                <p className="text-sm leading-7 text-inksoft">
                  Your school details, the modules you need and the people who
                  will use each part of the system.
                </p>
              </div>
              <div className="grid gap-3 border-b border-line py-6 sm:grid-cols-[150px_1fr]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Demonstration
                </p>
                <p className="text-sm leading-7 text-inksoft">
                  A walk through attendance, exams, fees and marksheets using
                  examples from a school day.
                </p>
              </div>
              <div className="grid gap-3 border-b border-line py-6 sm:grid-cols-[150px_1fr]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Location
                </p>
                <p className="text-sm leading-7 text-inksoft">
                  Harion-8 (Betali), Sarlahi, Nepal
                </p>
              </div>
            </div>

            <p className="mt-8 max-w-lg text-xs leading-6 text-muted">
              The enquiry form will be connected after the school contact
              details and delivery channel are configured. This page does not
              collect submissions yet.
            </p>
          </div>

          <div className="bg-forest-deep px-8 py-10 text-paper">
            <p className="eyebrow-light">Before you write</p>
            <h2 className="font-display text-2xl font-semibold mt-4">
              A few useful details.
            </h2>
            <ul className="mt-7 space-y-4 text-sm text-paper/75">
              <li className="border-b border-paper/15 pb-4">Number of students and classes</li>
              <li className="border-b border-paper/15 pb-4">Whether fees are handled in the office</li>
              <li className="border-b border-paper/15 pb-4">Which roles need access</li>
              <li>When you would like to start</li>
            </ul>
            <Link
              href="/register"
              className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-saffron underline-offset-4 hover:underline"
            >
              See school onboarding <span aria-hidden="true">→</span>
            </Link>
            <div className="mt-8 border-t border-paper/15 pt-6 text-sm">
              <p className="text-paper/60">Already have an account?</p>
              <Link href="/login" className="mt-1 inline-block font-semibold text-paper">
                Go to school login
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
