import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Super Admin | ShikshaSetu",
};

const sections = [
  {
    title: "School Dashboard",
    description: "Open the current school's management dashboard.",
    href: "/dashboard",
  },
  {
    title: "User Management",
    description: "Manage the existing school's users and accounts.",
    href: "/users",
  },
  {
    title: "System Settings",
    description: "Review the current school's configuration.",
    href: "/settings",
  },
  {
    title: "Reports",
    description: "View the current school's reports.",
    href: "/reports",
  },
];

export default async function SuperAdminPage() {
  const user = await getSessionUser();

  if (!user) redirect("/login");

  const authorizedEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();

  if (
    user.role !== "admin" ||
    !authorizedEmail ||
    user.email.toLowerCase() !== authorizedEmail
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="space-y-8 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium text-indigo-600">
          SHIKSHASETU · PLATFORM CONTROL
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Super Admin Portal
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Welcome, {user.name}. You are signed in as the platform owner.
        </p>
      </div>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950">
        <h2 className="text-lg font-semibold">Platform owner access</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Your account has exclusive access to this page. Your existing school
          administrator account and permissions have not been replaced.
        </p>
        <p className="mt-3 text-sm font-medium">
          Authorized account: {user.email}
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Management shortcuts</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border p-5 transition hover:border-indigo-400 hover:shadow-sm"
            >
              <h3 className="font-semibold">{section.title}</h3>
              <p className="mt-2 text-sm text-gray-500">
                {section.description}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-indigo-600">
                Open section →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-sm text-gray-500">
        Note: This is the initial platform-owner portal for the current
        single-school system. Multi-school onboarding and tenant isolation
        require a separate implementation phase.
      </p>
    </main>
  );
}
