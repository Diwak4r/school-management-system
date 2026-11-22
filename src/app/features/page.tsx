import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

export const metadata: Metadata = {
  title: "Features | ShikshaSetu",
  description: "Explore school management features for schools in Nepal.",
};

const features = [
  ["Student Information", "Maintain student profiles, admission details, class records and academic history.", "01"],
  ["Attendance Management", "Organize daily attendance records for students and teachers.", "02"],
  ["Examinations and Results", "Manage examinations, marks, grades and academic performance.", "03"],
  ["Fee Management", "Organize fee structures, invoices, receipts and payment records.", "04"],
  ["Teachers and Staff", "Maintain staff profiles, responsibilities and user access.", "05"],
  ["Notices and Learning Notes", "Share school notices, classroom notes and important updates.", "06"],
  ["Reports and Marksheet", "Prepare academic reports and student marksheets using configured grading rules.", "07"],
  ["Role-based Access", "Provide separate access experiences for school administrators, teachers, students and parents.", "08"],
];

export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-slate-950 px-5 py-20 text-white lg:py-28">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Platform features</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              The essential tools to manage a modern school.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Bring academic records, daily operations and school communication together in one organized platform.
            </p>
          </div>
        </section>
        <section className="bg-slate-50 px-5 py-20">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, description, number]) => (
              <article key={number} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="text-sm font-black text-emerald-600">{number}</div>
                <h2 className="mt-5 text-xl font-extrabold text-slate-900">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="px-5 py-20">
          <div className="mx-auto max-w-5xl rounded-3xl bg-emerald-700 px-7 py-12 text-center text-white sm:px-12">
            <h2 className="text-3xl font-black">Bring your school operations together</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-emerald-50">Explore the platform and discuss an onboarding plan for your school.</p>
            <a href="/contact" className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-emerald-800 hover:bg-emerald-50">Request a demo</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
