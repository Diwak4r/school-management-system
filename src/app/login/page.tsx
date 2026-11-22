
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { login } from "@/actions/auth";
import { Icon, DemoFill, Flash } from "@/components/ui";
import { DEFAULT_SCHOOL } from "@/lib/grading";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();

  if (user) redirect("/dashboard");

  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : "";

  const features = [
    {
      icon: "cap",
      t: "Student & staff records",
      s: "ECD through Grade 10, one database",
    },
    {
      icon: "clipboard",
      t: "Daily attendance",
      s: "Mark once, report everywhere",
    },
    {
      icon: "file",
      t: "Exams & Nepal grading",
      s: "Auto grades, GPA and digital marksheets",
    },
    {
      icon: "folder",
      t: "Notes & study material",
      s: "Shared straight to each class",
    },
    {
      icon: "bell",
      t: "Notices & announcements",
      s: "For students and parents",
    },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative bg-forest-deep text-white overflow-hidden flex flex-col justify-between p-8 sm:p-12">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-forest/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-saffron/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3.5">
            <Image
              src="/images/emblem.png"
              alt="School emblem"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full ring-2 ring-white/20 bg-white/95"
            />

            <div>
              <div className="font-display text-xl font-bold leading-tight">
                {DEFAULT_SCHOOL.name}
              </div>
              <div className="font-deva text-saffron/90 text-sm mt-0.5">
                {DEFAULT_SCHOOL.nameNp}
              </div>
            </div>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight mt-10 max-w-md">
            The school office,{" "}
            <span className="text-saffron">digitised.</span>
          </h1>

          <p className="text-white/70 mt-3 max-w-md text-sm leading-relaxed">
            A complete management system for students, teachers, parents and
            administration — from attendance to marksheets, in one secure
            place.
          </p>

          <ul className="mt-8 space-y-3.5 max-w-md">
            {features.map((f) => (
              <li key={f.t} className="flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon
                    name={f.icon}
                    className="w-4 h-4 text-saffron"
                  />
                </span>

                <div>
                  <div className="text-sm font-bold">{f.t}</div>
                  <div className="text-xs text-white/55">{f.s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/45 flex items-center gap-2 mt-10">
          <Icon name="pin" className="w-3.5 h-3.5" />
          {DEFAULT_SCHOOL.address} · Government School · ECD – Grade 10
        </div>
      </div>

      {/* Login panel */}
      <div className="paper-bg flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image
              src="/images/emblem.png"
              alt=""
              width={44}
              height={44}
              className="w-11 h-11 rounded-full bg-white"
            />

            <div>
              <div className="font-display font-bold text-ink leading-tight">
                {DEFAULT_SCHOOL.name}
              </div>
              <div className="text-xs text-muted">
                Harion-8 (Betali), Sarlahi
              </div>
            </div>
          </div>

          <div className="card p-6 sm:p-7">
            <div className="flex items-center gap-2 text-forest mb-1">
              <Icon name="lock" className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                Secure sign in
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold text-ink">
              Welcome back
            </h2>

            <p className="text-sm text-muted mt-1">
              Sign in with your school account to continue.
            </p>

            {err && (
              <div className="mt-4 flex items-start gap-2 text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg px-3 py-2.5">
                <Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />
                {err}
              </div>
            )}

            <form action={login} className="mt-5 space-y-4">
              <label className="block">
                <span className="lbl">Email address</span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="you@sjjs.edu.np"
                  className="inp"
                />
              </label>

              <label className="block">
                <span className="lbl">Password</span>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="inp"
                />
              </label>

              <button type="submit" className="btn-primary w-full py-2.5">
                Sign in <Icon name="arrow" className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-[11px] text-muted text-center mt-4">
            Sessions expire automatically after 7 days of inactivity.
          </p>
        </div>

        <Flash />
      </div>
    </div>
  );
}
