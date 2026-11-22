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
      <main className="bg-slate-50">
        <section className="bg-slate-950 px-5 py-20 text-white">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Contact us</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Let us talk about your school.</h1>
            <p className="mt-6 max-w-2xl leading-8 text-slate-300">
              Interested in a demonstration or school onboarding? Start a conversation about your institution needs.
            </p>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black text-slate-900">Request a platform discussion</h2>
            <p className="mt-4 leading-7 text-slate-600">
              We can discuss your school size, current record-keeping process, required modules and possible implementation steps.
            </p>
            <div className="mt-8 space-y-4">
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-sm font-bold text-slate-900">School onboarding</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">Share your institution details before account provisioning is enabled.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-sm font-bold text-slate-900">Product demonstration</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">Review the modules and discuss how they may fit your school workflow.</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-emerald-700 p-8 text-white">
            <h2 className="text-2xl font-black">Ready to explore?</h2>
            <p className="mt-4 leading-7 text-emerald-50">
              The enquiry delivery channel will be connected after the platform contact details and backend are configured. No form submissions are collected on this page yet.
            </p>
            <Link href="/register" className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50">
              View school onboarding
            </Link>
            <div className="mt-8 border-t border-emerald-500 pt-6">
              <p className="text-sm text-emerald-100">Already have a school account?</p>
              <Link href="/login" className="mt-2 inline-block font-bold text-white underline underline-offset-4">Go to school login</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
