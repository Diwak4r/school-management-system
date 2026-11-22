"use client";

import { useState } from "react";
import { Icon, Field, ModalCancel } from "@/components/ui";

export function NoteForm({
  action,
  classes,
  allSections,
  allSubjects,
}: {
  action: (fd: FormData) => void;
  classes: { id: number; name?: string; className?: string }[];
  allSections: { id: number; name: string }[];
  allSubjects: { id: number; name: string }[];
}) {
  const [type, setType] = useState("text");
  return (
    <form action={action} className="grid grid-cols-2 gap-3.5">
      <Field label="Title *" className="col-span-2">
        <input name="title" required className="inp" placeholder="e.g. Chapter 4 — Fractions, exercises" />
      </Field>
      <Field label="Type" className="col-span-2">
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="inp">
          <option value="text">Text note</option>
          <option value="link">Link (web resource)</option>
        </select>
      </Field>
      <Field label="Class">
        <select name="classId" className="inp">
          <option value="">—</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name ?? c.className}</option>
          ))}
        </select>
      </Field>
      <Field label="Section">
        <select name="sectionId" className="inp">
          <option value="">—</option>
          {allSections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Subject" className="col-span-2">
        <select name="subjectId" className="inp">
          <option value="">— General —</option>
          {allSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      {type === "text" ? (
        <Field label="Content *" className="col-span-2">
          <textarea name="content" required rows={5} className="inp resize-y" placeholder="Write the note or exercise here…" />
        </Field>
      ) : (
        <Field label="URL *" className="col-span-2">
          <input name="url" required type="url" className="inp" placeholder="https://…" />
        </Field>
      )}
      <div className="col-span-2 flex justify-end gap-2">
        <ModalCancel />
        <button className="btn-primary"><Icon name="check" className="w-4 h-4" /> Publish</button>
      </div>
    </form>
  );
}
