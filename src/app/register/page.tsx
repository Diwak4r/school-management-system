import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteLayout";

export const metadata: Metadata = {
  title: "School Onboarding | ShikshaSetu",
  description: "Learn how schools can prepare for ShikshaSetu onboarding.",
};

const steps = [
  ["1", "School information", "Prepare your school name, address, contact details and basic institutional information."],
  ["2", "Requirement discussion", "Identify the modules, user roles and workflows your school needs."],
  ["3", "Secure setup", "The platform team will configure a separate school environment and authorized administrator access."],
  ["4", "Training and launch", "Review the setup, train relevant users and agree on a launch plan."],
];

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-slate-950 px-5 py-20 text-white lg:py-24">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">School onboarding</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">Bring your school onto ShikshaSetu.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              We are preparing a secure registration and onboarding process for schools. Account creation will become available after school data isolation and administrator controls are implemented.
            </p>
          </div>
        </section>
        <section className="bg-slate-50 px-5 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900">How onboarding will work</h2>
            <div className="mt-10 space-y-5">
              {steps.map(([number, title, description]) => (
                <div key={number} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-black text-emerald-800">{number}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
              <h3 className="text-xl font-black text-slate-900">Registration is not open yet</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                This page explains the planned onboarding process. It does not create an account, activate a subscription or grant administrator access.
              </p>
              <Link href="/contact" className="mt-6 inline-flex rounded-xl bg-emerald-700 px-6 py-3 text-sm font-extrabold text-white hover:bg-emerald-800">
                Discuss school onboarding
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
