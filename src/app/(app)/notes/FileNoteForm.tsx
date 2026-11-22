
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Field } from "@/components/ui";

export function ReadNote({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-ghost btn-sm"
      >
        {open ? "Hide" : "Read"}
      </button>

      {open && (
        <div className="w-full mt-1 rounded-lg bg-forest-mist/50 border border-linesoft p-3 text-xs text-inksoft whitespace-pre-line max-h-48 overflow-y-auto">
          {content}
        </div>
      )}
    </>
  );
}

export function FileNoteForm({
  classes,
  allSections,
  allSubjects,
  userId,
}: {
  classes: { id: number; className?: string; name?: string }[];
  allSections: { id: number; name: string }[];
  allSubjects: { id: number; name: string }[];
  userId: number;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;

    if (!file || file.size === 0) {
      setErr("Choose a file first (PDF, DOC, PPT, image or other document).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErr("File is too large (max 15 MB).");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Upload failed");
      }

      const j = await res.json();

      router.push(
        `/notes?flash=${encodeURIComponent(`“${j.title}” uploaded and shared.`)}`
      );
      router.refresh();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={open ? "btn-primary" : "btn-saffron"}
      >
        <Icon name="upload" className="w-4 h-4" />
        Upload file
      </button>

      {open && (
        <div className="card p-5 mt-3 fade-up">
          <h3 className="font-bold text-sm text-ink mb-3">
            Upload a file (PDF, DOCX, PPTX, image…)
          </h3>

          <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3.5">
            <Field label="Title *" className="col-span-2">
              <input
                name="title"
                required
                className="inp"
                placeholder="e.g. Science — Unit 3 worksheet"
              />
            </Field>

            <Field label="Class" className="col-span-2 sm:col-span-1">
              <select name="classId" className="inp">
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className ?? c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Section" className="col-span-2 sm:col-span-1">
              <select name="sectionId" className="inp">
                <option value="">—</option>
                {allSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Subject" className="col-span-2 sm:col-span-1">
              <select name="subjectId" className="inp">
                <option value="">— General —</option>
                {allSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="File *" className="col-span-2 sm:col-span-1">
              <input
                name="file"
                type="file"
                required
                className="inp file:text-xs file:mr-2 file:rounded-md file:border-0 file:bg-forest-soft file:px-2.5 file:py-1.5 file:font-bold file:text-forest"
              />
            </Field>

            <input type="hidden" name="userId" value={userId} />

            {err && (
              <p className="col-span-2 text-xs font-semibold text-danger">
                {err}
              </p>
            )}

            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={busy}
                className="btn-saffron"
              >
                <Icon name="upload" className="w-4 h-4" />
                {busy ? "Uploading…" : "Upload & share"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
