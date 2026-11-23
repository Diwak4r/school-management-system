import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

const features = [
  ["01", "Student records", "Admissions, profiles, class assignment and academic history."],
  ["02", "Daily attendance", "Mark the register once, then report it by student, class or section."],
  ["03", "Examinations", "Subjects, marks, grading bands, GPA and printable marksheets."],
  ["04", "Fees and receipts", "Structures, invoices, payments and the balance still due."],
  ["05", "Teachers and staff", "Profiles, subject assignments and the right access for each role."],
  ["06", "Notes and notices", "Class notes and announcements shared with the people who need them."],
];

const schoolDay = [
  ["09:00", "Assembly", "Register and daily announcements"],
  ["09:40", "Periods", "Six periods, subject by subject"],
  ["12:30", "Mid-day meal", "Break, then attendance is checked"],
  ["13:15", "Periods", "Class work and study notes"],
  ["15:30", "Dismissal", "The day's records are closed"],
];

const schoolFacts = [
  ["Academic year", "2082/83 — earlier years kept for history"],
  ["Grading", "Marks, letter grades, GPA and fail rules"],
  ["Attendance", "Daily register with a view for parents"],
  ["Access", "Admin, teacher, student and parent accounts"],
];

export default function HomePage() {
  return (
    <>
      <div className="h-1 bg-forest" />
      <SiteHeader />

      <main className="bg-paper text-ink">
        <section className="marketing-wrap grid gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="eyebrow-dark">ShikshaSetu · Harion, Sarlahi</p>
            <h1 className="display-title mt-6 max-w-2xl">
              Less paperwork.
              <span className="block text-forest">Better school days.</span>
            </h1>
            <p className="lede-dark">
              ShikshaSetu keeps student records, attendance, examinations and
              fees together — so the office, teachers and parents are looking
              at the same information.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link href="/contact" className="marketing-btn">
                Talk to us <span aria-hidden="true">→</span>
              </Link>
              <Link href="/features" className="marketing-link">
                See what it covers <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="mt-12 max-w-lg border-t border-line pt-5 text-xs leading-6 text-muted">
              Built around the records a school here keeps every day — from
              the admission register to the final marksheet.
            </p>
          </div>

          <div className="paper-card">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                A school day
              </p>
              <p className="text-xs text-muted">2082/83</p>
            </div>
            <div className="divide-y divide-linesoft px-6">
              {schoolDay.map(([time, label, note]) => (
                <div key={time} className="grid grid-cols-[58px_1fr] gap-4 py-4">
                  <span className="font-display text-sm text-forest">{time}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="mt-0.5 text-xs text-muted">{note}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-6 py-4 text-xs text-muted">
              Shree Jana Jagriti Secondary School · ECD – Grade 10
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-line bg-surface">
          <div className="marketing-wrap py-20">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="eyebrow-dark">What lives here</p>
                <h2 className="section-title mt-4">
                  The records that matter, in one place.
                </h2>
                <p className="mt-5 text-sm leading-7 text-inksoft">
                  Not a collection of disconnected tools. One set of records
                  that the whole school can work from.
                </p>
              </div>
              <div className="grid gap-x-10 sm:grid-cols-2">
                {features.map(([number, title, description]) => (
                  <div key={number} className="rule-row md:grid-cols-[40px_1fr]">
                    <span className="font-display text-sm text-saffron-dark">
                      {number}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{title}</h3>
                      <p className="mt-1.5 text-xs leading-6 text-muted">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-wrap grid gap-12 py-20 md:grid-cols-2">
          <div>
            <p className="eyebrow-dark">Made for this context</p>
            <h2 className="section-title mt-4">
              Built around how schools here actually work.
            </h2>
            <p className="mt-5 text-sm leading-7 text-inksoft">
              Nepali academic years, letter grades and GPA, class sections,
              and separate views for the people involved — these are part of
              the structure, not an afterthought.
            </p>
            <Link href="/contact" className="marketing-link mt-6">
              Discuss your school <span aria-hidden="true">→</span>
            </Link>
          </div>
          <dl className="border-t border-line">
            {schoolFacts.map(([term, detail]) => (
              <div
                key={term}
                className="grid gap-2 border-b border-line py-5 sm:grid-cols-[140px_1fr]"
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  {term}
                </dt>
                <dd className="text-sm leading-6 text-ink">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-forest-deep text-paper">
          <div className="marketing-wrap flex flex-col gap-8 py-16 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow-light">Come and look</p>
              <h2 className="section-title mt-4 max-w-xl">
                Bring one register. We will show you the rest.
              </h2>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 self-start rounded-md border border-paper/30 px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-paper/10 md:self-auto"
            >
              Arrange a conversation <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
