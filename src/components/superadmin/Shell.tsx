"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import { SchoolMark } from "@/components/SchoolMark";
import { Avatar, Flash, Icon } from "@/components/ui";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  section: string;
  planned?: boolean;
};

const items: NavItem[] = [
  { label: "Overview", href: "/superadmin", icon: "grid", section: "Platform" },
  { label: "Schools", href: "/superadmin/schools", icon: "cap", section: "Platform" },
  { label: "Users", href: "/superadmin/users", icon: "users", section: "Platform" },
  { label: "Subscriptions", href: "/superadmin/subscriptions", icon: "calendar", section: "Platform" },
  { label: "Plans", href: "/superadmin/plans", icon: "file", section: "Platform" },
  { label: "Analytics", href: "/superadmin/analytics", icon: "chart", section: "Insights" },
  { label: "Reports", href: "/superadmin/reports", icon: "file", section: "Insights" },
  { label: "Audit Logs", href: "/superadmin/audit", icon: "shield", section: "Insights" },
  { label: "Platform Settings", href: "/superadmin/settings", icon: "gear", section: "System" },
  { label: "My Profile", href: "/profile", icon: "user", section: "Account" },
];

function groups() {
  const out: { name: string; items: NavItem[] }[] = [];
  for (const item of items) {
    let group = out.find((g) => g.name === item.section);
    if (!group) {
      group = { name: item.section, items: [] };
      out.push(group);
    }
    group.items.push(item);
  }
  return out;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {groups().map((group) => (
        <div key={group.name}>
          <div className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-paper/40">
            {group.name}
          </div>
          <div className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const cls = [
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-paper/12 text-paper"
                  : item.planned
                    ? "text-paper/35"
                    : "text-paper/65 hover:bg-paper/8 hover:text-paper",
              ].join(" ");
              return item.planned ? (
                <span key={item.href} className={cls} title="Available in a later phase">
                  <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-paper/25">
                    Next
                  </span>
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cls}
                >
                  <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-saffron" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <SchoolMark light />
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold leading-tight text-paper">
          ShikshaSetu
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-saffron">
          Platform control
        </div>
      </div>
    </div>
  );
}

function Account({ user }: { user: { name: string; email: string } }) {
  return (
    <div className="border-t border-paper/10 px-2 pt-4">
      <div className="flex items-center gap-2.5">
        <Avatar name={user.name} className="w-9 h-9 text-xs ring-2 ring-paper/20" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-paper">{user.name}</div>
          <div className="truncate text-[11px] text-paper/55">{user.email}</div>
        </div>
      </div>
      <form action={logout} className="mt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-paper/60 transition hover:bg-paper/8 hover:text-paper"
        >
          <Icon name="logout" className="w-4 h-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function SuperAdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-forest-deep px-4 py-5 lg:flex">
        <Brand />
        <div className="mt-8 flex-1 overflow-y-auto">
          <NavList />
        </div>
        <Account user={user} />
      </aside>

      <div className="min-w-0 flex-1 paper-bg">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <button
            type="button"
            aria-label="Open platform navigation"
            onClick={() => setOpen(true)}
            className="btn-ghost btn-sm"
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-ink/40"
              onClick={() => setOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-forest-deep px-4 py-5">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="p-1 text-paper/70"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-8 flex-1 overflow-y-auto">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
              <Account user={user} />
            </aside>
          </div>
        )}

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <Flash />
      </div>
    </div>
  );
}
