import Link from "next/link";
import { SchoolMark } from "@/components/SchoolMark";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="marketing-wrap flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <SchoolMark />
          <span className="flex flex-col">
            <span className="font-display text-lg font-semibold leading-none text-ink">
              ShikshaSetu
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted">
              Harion · Sarlahi
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-inksoft underline-offset-8 transition-colors hover:text-forest hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-inksoft transition-colors hover:text-forest sm:inline"
          >
            School login
          </Link>
          <Link href="/contact" className="marketing-btn !px-4 !py-2">
            Talk to us
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="marketing-wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <SchoolMark light />
            <span className="font-display text-xl font-semibold text-paper">
              ShikshaSetu
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-paper/60">
            School records, attendance, examinations and fees — kept together
            for the people who use them every day.
          </p>
          <p className="mt-4 text-xs text-paper/45">
            Harion-8 (Betali), Sarlahi, Nepal
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-saffron">
            Explore
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-paper">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-saffron">
            Your school
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link href="/login" className="hover:text-paper">
              School login
            </Link>
            <Link href="/register" className="hover:text-paper">
              Onboarding
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="marketing-wrap flex flex-col gap-2 py-5 text-xs text-paper/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ShikshaSetu</p>
          <p>Made for the school office, not for a demo reel.</p>
        </div>
      </div>
    </footer>
  );
}
