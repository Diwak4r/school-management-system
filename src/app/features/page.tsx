import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

export const metadata: Metadata = {
  title: "Features | ShikshaSetu",
  description: "Explore school management features for schools in Nepal.",
};

const features = [
  ["01", "Student information", "Profiles, admission details, class records and academic history."],
  ["02", "Attendance", "A daily register with class, section and student-level reports."],
  ["03", "Examinations and results", "Exams, marks, configured grading bands, GPA and marksheets."],
  ["04", "Fees", "Fee structures, invoices, receipts, payments and outstanding balances."],
  ["05", "Teachers and staff", "Staff profiles, subject assignments and user access."],
  ["06", "Notes and learning material", "School notices, classroom notes and updates for each class."],
  ["07", "Reports and marksheet", "Academic reports and printable marksheets from the same records."],
  ["08", "Role-based access", "Separate views for administrators, teachers, students and parents."],
];

export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-paper text-ink">
        <section className="marketing-wrap border-b border-line py-16 lg:py-24">
          <p className="eyebrow-dark">What is inside</p>
          <h1 className="display-title mt-6 max-w-3xl">
            The work a school office actually does.
          </h1>
          <p className="lede-dark">
            Student records, the daily register, exams, fees and the letters
            that go home — kept together instead of spread across notebooks
            and spreadsheets.
          </p>
        </section>

        <section className="marketing-wrap py-14">
          <div className="grid gap-x-12 sm:grid-cols-2">
            {features.map(([number, title, description]) => (
              <div key={number} className="rule-row md:grid-cols-[48px_1fr]">
                <span className="font-display text-sm text-saffron-dark">
                  {number}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-inksoft">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="marketing-wrap pb-20">
          <div className="paper-card flex flex-col gap-6 px-8 py-10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="section-title text-2xl">
                See it with your own records.
              </h2>
              <p className="mt-2 text-sm text-inksoft">
                A short conversation is enough to work out what your school
                needs.
              </p>
            </div>
            <Link href="/contact" className="marketing-btn self-start">
              Talk to us <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
