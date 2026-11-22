"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";

/* ---------------------------------- Icons --------------------------------- */

const paths: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  cap: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <path d="M22 10v6" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  clipboard: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  pen: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  folder: (
    <>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15v-4M12 15V8M17 15v-7" />
    </>
  ),
  activity: (
    <>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  alert: (
    <>
      <path d="m10.3 3.9-8.5 14.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5M12 3v12" />
    </>
  ),
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2z" />
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.3L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
};

export function Icon({ name, className = "w-4 h-4", stroke = 2 }: { name: string; className?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}

/* --------------------------------- Primitives ----------------------------- */

const avatarColors = ["#1d5c3f", "#b57617", "#2e6f8e", "#7c5cb8", "#b23a2f", "#3d7a5e", "#8a5a2b"];
export function Avatar({ name, className = "w-9 h-9 text-xs" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const color = avatarColors[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % avatarColors.length];
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${className}`} style={{ background: color }}>
      {initials || "?"}
    </span>
  );
}

const tones: Record<string, string> = {
  green: "bg-forest-soft text-forest border border-forest/20",
  amber: "bg-saffron-soft text-saffron-dark border border-saffron/30",
  red: "bg-danger-soft text-danger border border-danger/20",
  blue: "bg-info-soft text-info border border-info/20",
  gray: "bg-paper text-inksoft border border-line",
};
export function Badge({ tone = "gray", children }: { tone?: string; children: React.ReactNode }) {
  return <span className={`badge ${tones[tone] ?? tones.gray}`}>{children}</span>;
}

export function Stat({ label, value, sub, icon, tone = "green" }: { label: string; value: React.ReactNode; sub?: string; icon: string; tone?: string }) {
  const iconTones: Record<string, string> = {
    green: "bg-forest-soft text-forest",
    amber: "bg-saffron-soft text-saffron-dark",
    blue: "bg-info-soft text-info",
    red: "bg-danger-soft text-danger",
  };
  return (
    <div className="card p-4 flex items-start gap-3 fade-up">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconTones[tone] ?? iconTones.green}`}>
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
        <div className="text-xl font-extrabold text-ink leading-tight truncate">{value}</div>
        {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon = "folder", title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-forest-mist border border-line flex items-center justify-center text-muted mb-3">
        <Icon name={icon} className="w-6 h-6" stroke={1.6} />
      </div>
      <div className="font-bold text-ink text-sm">{title}</div>
      {sub && <div className="text-xs text-muted mt-1 max-w-xs">{sub}</div>}
    </div>
  );
}

export function Donut({ value, size = 92, label, color = "#1d5c3f" }: { value: number; size?: number; label?: string; color?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2ddcd" strokeWidth="9" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="9" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-extrabold text-ink leading-none">{Math.round(value)}%</div>
        {label && <div className="text-[10px] font-bold uppercase tracking-wide text-muted mt-0.5">{label}</div>}
      </div>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="lbl">{label}</span>
      {children}
    </label>
  );
}

/* ---------------------------------- Modal --------------------------------- */

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8 no-print">
      <div className="fixed inset-0 bg-forest-deep/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative card w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-auto fade-up`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h3 className="font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink p-1 rounded-md hover:bg-paper cursor-pointer" aria-label="Close">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmButton({
  action,
  label,
  message,
  confirmText = "Confirm",
  className = "btn-danger btn-sm",
  icon = "trash",
  title,
  fields = [],
}: {
  action: (fd: FormData) => void;
  label?: string;
  message: string;
  confirmText?: string;
  className?: string;
  icon?: string;
  title?: string;
  fields?: { name: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title={title}>
        <Icon name={icon} className="w-3.5 h-3.5" />
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Please confirm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-danger-soft text-danger flex items-center justify-center shrink-0">
            <Icon name="alert" className="w-4 h-4" />
          </div>
          <p className="text-sm text-inksoft">{message}</p>
        </div>
        <form action={action} className="flex justify-end gap-2 mt-5">
          {fields.map((f) => (
            <input key={f.name} type="hidden" name={f.name} value={f.value} />
          ))}
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">
            Cancel
          </button>
          <button type="submit" className="btn bg-danger text-white hover:bg-danger/90 btn-sm">
            {confirmText}
          </button>
        </form>
      </Modal>
    </>
  );
}

const ModalCloseCtx = createContext<() => void>(() => {});

/** A button that opens a modal containing a (server-action) form. */
export function FormModal({
  title,
  btnClass = "btn-primary",
  icon,
  label,
  wide = false,
  children,
}: {
  title: string;
  btnClass?: string;
  icon?: string;
  label?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <ModalCloseCtx.Provider value={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        {icon && <Icon name={icon} className="w-3.5 h-3.5" />}
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} wide={wide}>
        {children}
      </Modal>
    </ModalCloseCtx.Provider>
  );
}

export function ModalCancel() {
  const close = useContext(ModalCloseCtx);
  return (
    <button type="button" onClick={close} className="btn-ghost btn-sm">
      Cancel
    </button>
  );
}

/* ---------------------------------- Flash --------------------------------- */

function FlashInner() {
  const params = useSearchParams();
  const flash = params.get("flash");
  const flashErr = params.get("flashErr");
  const messageKey = flashErr ?? flash;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!messageKey) return;
    const t = setTimeout(() => setDismissedKey(messageKey), 4000);
    return () => clearTimeout(t);
  }, [messageKey]);

  if (!messageKey || dismissedKey === messageKey) return null;
  const ok = !flashErr;
  return (
    <div className="fixed bottom-5 right-5 z-[60] toast-in no-print">
      <div className={`flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-xl shadow-lg border text-sm font-semibold ${ok ? "bg-forest-dark text-white border-forest" : "bg-danger text-white border-danger-soft"}`}>
        <Icon name={ok ? "check" : "alert"} className="w-4 h-4" />
        <span>{flashErr ?? flash}</span>
        <button onClick={() => setDismissedKey(messageKey)} className="p-1 rounded-md hover:bg-white/15 cursor-pointer" aria-label="Dismiss">
          <Icon name="x" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
export function Flash() {
  return (
    <Suspense fallback={null}>
      <FlashInner />
    </Suspense>
  );
}

/* ------------------------------ Small helpers ----------------------------- */

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      <Icon name="printer" className="w-4 h-4" />
      {label}
    </button>
  );
}

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-inksoft hover:text-forest mb-4">
      <Icon name="back" className="w-4 h-4" />
      {label}
    </Link>
  );
}

export function DemoFill({ email, password }: { email: string; password: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const e = document.getElementById("login-email") as HTMLInputElement | null;
        const p = document.getElementById("login-password") as HTMLInputElement | null;
        if (e) e.value = email;
        if (p) p.value = password;
      }}
      className="text-[11px] font-bold text-saffron-dark hover:text-forest cursor-pointer underline decoration-dotted underline-offset-2"
    >
      use
    </button>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-line border-t-forest rounded-full animate-spin" style={{ borderWidth: 3 }} />
    </div>
  );
}

/* ------------------------------ Active nav pill --------------------------- */

export function useActivePath() {
  return usePathname();
}
