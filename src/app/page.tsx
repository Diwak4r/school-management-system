import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Student Management",
    description:
      "Manage student admissions, profiles, class assignments and academic records from one organized platform.",
  },
  {
    number: "02",
    title: "Attendance Tracking",
    description:
      "Record daily attendance and keep teachers, administrators and parents informed.",
  },
  {
    number: "03",
    title: "Examinations & Results",
    description:
      "Manage examinations, marks, grading and digital marksheets with Nepal's school grading requirements in mind.",
  },
  {
    number: "04",
    title: "Fee Management",
    description:
      "Organize fee structures, invoices, payments and outstanding balances.",
  },
  {
    number: "05",
    title: "Teachers & Staff",
    description:
      "Maintain staff profiles, responsibilities and school-related information.",
  },
  {
    number: "06",
    title: "Notes & Communication",
    description:
      "Share learning materials, notices and important announcements with your school community.",
  },
];

const audiences = [
  "Community and government schools",
  "Private and boarding schools",
  "Basic and secondary schools",
  "Schools from ECD to Grade 12",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-black text-white">
              S
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">
                Shiksha<span className="text-emerald-700">Setu</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                School Management Platform
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-emerald-700">
              Features
            </a>
            <a href="#solutions" className="transition hover:text-emerald-700">
              Solutions
            </a>
            <a href="#about" className="transition hover:text-emerald-700">
              About
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              School Login
            </Link>
            <Link
              href="/contact"
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute -right-32 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -bottom-48 -left-24 h-[450px] w-[450px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-32">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold tracking-wide text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              BUILT FOR THE FUTURE OF EDUCATION IN NEPAL
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
              One platform.
              <span className="block text-emerald-400">
                Smarter schools.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Simplify school administration, connect your school community
              and manage academic operations with one modern school management
              platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
              >
                Explore the Platform →
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                School Login
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs font-semibold text-slate-400">
              <span>✓ Academic Management</span>
              <span>✓ Digital Records</span>
              <span>✓ School Administration</span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="rounded-xl bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                    Platform Preview
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    School Overview
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  Dashboard
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Students", "1,250", "Academic records"],
                  ["Teachers", "48", "Staff management"],
                  ["Attendance", "94.5%", "Daily overview"],
                  ["Classes", "24", "Academic structure"],
                ].map(([label, value, caption]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                      {value}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {caption}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  A connected school community
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Academic records, attendance, examinations and school
                  operations — organized in one place.
                </p>
                <div className="mt-5 flex gap-2">
                  <span className="h-2 flex-1 rounded-full bg-emerald-400" />
                  <span className="h-2 flex-1 rounded-full bg-emerald-400/60" />
                  <span className="h-2 flex-1 rounded-full bg-emerald-400/30" />
                </div>
              </div>

              <p className="mt-4 text-center text-[10px] text-slate-400">
                Illustrative dashboard preview · Sample figures
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
              Everything in one place
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Tools to manage your entire school
            </h2>
            <p className="mt-5 leading-7 text-slate-600">
              Bring everyday school operations together through a unified
              digital platform.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-slate-200 bg-white p-7 transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-slate-200/60"
              >
                <span className="text-sm font-black text-emerald-700">
                  {feature.number}
                </span>
                <h3 className="mt-5 text-lg font-extrabold text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
              Designed for Nepal
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Technology that understands your school.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              From student records and attendance to examinations and
              fee administration, the platform is designed around the
              practical needs of schools in Nepal.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Talk to Our Team →
            </Link>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-7 sm:p-10">
            <h3 className="text-xl font-extrabold text-slate-950">
              Who can use the platform?
            </h3>
            <ul className="mt-7 space-y-4">
              {audiences.map((audience) => (
                <li key={audience} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    ✓
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {audience}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* About / CTA */}
      <section id="about" className="bg-slate-950 py-20">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-400">
            Move your school forward
          </p>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Ready to simplify school management?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-300">
            Get in touch to learn more about the platform and discuss how it
            can support your school&apos;s digital transformation.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400"
          >
            Contact Us →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 text-sm text-slate-400 sm:flex-row sm:items-center lg:px-8">
          <p>
            © {new Date().getFullYear()} ShikshaSetu. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href="/login" className="transition hover:text-white">
              School Login
            </Link>
            <Link href="/contact" className="transition hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

