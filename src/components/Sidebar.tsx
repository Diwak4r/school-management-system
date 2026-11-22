
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, Avatar } from "@/components/ui";
import { logout } from "@/actions/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  section: string;
};

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent / Guardian",
};

export default function Sidebar({
  items,
  user,
  school,
}: {
  items: NavItem[];
  user: { name: string; role: string; email: string };
  school: { name: string; logoUrl: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sections = items.reduce<Record<string, NavItem[]>>((acc, it) => {
    (acc[it.section] ??= []).push(it);
    return acc;
  }, {});

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href + "/")) ||
    (href === "/students" &&
      pathname.startsWith("/students") &&
      user.role === "student" &&
      pathname === "/students");

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {Object.entries(sections).map(([section, its]) => (
        <div key={section} className="mt-4 first:mt-2">
          <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/35">
            {section}
          </div>

          <ul className="space-y-0.5">
            {its.map((it) => {
              const active = isActive(it.href);

              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold transition-colors ${
                      active
                        ? "bg-white/12 text-white shadow-inner"
                        : "text-white/65 hover:text-white hover:bg-white/6"
                    }`}
                  >
                    <Icon
                      name={it.icon}
                      className={`w-4 h-4 ${
                        active ? "text-saffron" : "text-white/40"
                      }`}
                    />

                    {it.label}

                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-saffron" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10"
    >
      <Image
        src={school.logoUrl || "/images/emblem.png"}
        alt="School logo"
        width={36}
        height={36}
        unoptimized
        className="w-9 h-9 rounded-full bg-white object-contain shrink-0"
      />

      <div className="min-w-0">
        <div className="text-[13px] font-extrabold leading-tight text-white truncate">
          SJJS · SMS
        </div>

        <div className="text-[10.5px] text-white/45 truncate leading-tight mt-0.5">
          {school.name}
        </div>
      </div>
    </Link>
  );

  const userFoot = (
    <div className="p-3 border-t border-white/10">
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <Avatar name={user.name} className="w-8 h-8 text-[10px]" />

        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold text-white truncate">
            {user.name}
          </div>

          <div className="text-[10.5px] text-white/45 truncate">
            {roleLabel[user.role] ?? user.role}
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <Icon name="logout" className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-forest-deep min-h-screen sticky top-0 max-h-screen no-print">
        {brand}
        {nav}
        {userFoot}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-forest-deep text-white flex items-center justify-between px-4 py-3 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <Image
            src={school.logoUrl || "/images/emblem.png"}
            alt="School logo"
            width={32}
            height={32}
            unoptimized
            className="w-8 h-8 rounded-full bg-white object-contain"
          />

          <div className="min-w-0">
            <div className="text-[13px] font-extrabold leading-none">
              SJJS · SMS
            </div>

            <div className="text-[10px] text-white/50 mt-0.5">
              {roleLabel[user.role] ?? user.role}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <Icon name="logout" className="w-4.5 h-4.5" />
            </button>
          </form>

          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 cursor-pointer"
            aria-label="Menu"
            aria-expanded={open}
          >
            <Icon name={open ? "x" : "menu"} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 no-print">
          <div
            className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 top-0 bottom-0 w-72 bg-forest-deep flex flex-col shadow-2xl">
            {brand}
            {nav}
            {userFoot}
          </div>
        </div>
      )}
    </>
  );
}
