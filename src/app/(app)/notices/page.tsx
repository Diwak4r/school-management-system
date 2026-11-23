import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { notices, classes, sections, users, enrollments, classSubjects, parentChildren } from "@/db/schema";
import { requireUser, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { fmtDate } from "@/lib/grading";
import { PageHead, Badge, FormModal, ModalCancel, Field, ConfirmButton, Icon, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function publishNotice(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role === "student" || user.role === "parent") await flashTo("/dashboard", "Not permitted.", true);
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  const expiresAt = formData.get("expiresAt") ? new Date(String(formData.get("expiresAt")) + "T23:59:59") : null;
  const classId = formData.get("classId") ? Number(formData.get("classId")) : null;
  const sectionId = formData.get("sectionId") ? Number(formData.get("sectionId")) : null;
  if (!title || !body) await flashTo("/notices", "Title and description are required.", true);

  if (user.role === "teacher" && classId) {
    const mine = await db.select().from(classSubjects).where(eq(classSubjects.teacherId, user.teacherId!));
    if (!mine.some((m) => m.classId === classId)) await flashTo("/notices", "You can only post notices for your assigned classes.", true);
  }

  const [row] = await db.insert(notices).values({ title, body, priority, classId, sectionId, publishedById: user.id, expiresAt }).returning({ id: notices.id });
  await logAudit(user.id, "Published notice", "notice", row.id, title);
  await flashTo("/notices", "Notice published. Students and parents in scope will see it immediately.");
}

export async function deleteNotice(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== "admin") await flashTo("/notices", "Only administrators can delete notices.", true);
  const id = Number(formData.get("id"));
  await db.delete(notices).where(eq(notices.id, id));
  await logAudit(user.id, "Deleted notice", "notice", id);
  await flashTo("/notices", "Notice deleted.");
}

export default async function NoticesPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const canPublish = user.role === "admin" || user.role === "teacher";
  const now = new Date();
  const cutoff = new Date(now.getTime() - 3 * 86400_000);

  let where: any = sql`true`;
  if (user.role === "student") {
    where = sql`${notices.classId} is null or ${notices.classId} in (select class_id from enrollments where student_id = ${user.studentId} and status = 'active')`;
  } else if (user.role === "parent") {
    where = sql`${notices.classId} is null or ${notices.classId} in (select class_id from enrollments where student_id in (select student_id from parent_children where user_id = ${user.id}) and status = 'active')`;
  } else if (user.role === "teacher") {
    where = sql`(${notices.classId} is null or ${notices.classId} in (select class_id from class_subjects where teacher_id = ${user.teacherId}) or ${notices.publishedById} = ${user.id})`;
  }

  const [allClasses, allSections, list] = await Promise.all([
    db.select().from(classes).orderBy(classes.sortOrder),
    sectionsQuery(),
    db
      .select({ n: notices, className: classes.name, by: users.name })
      .from(notices)
      .leftJoin(classes, eq(classes.id, notices.classId))
      .leftJoin(users, eq(users.id, notices.publishedById))
      .where(and(where, sql`${notices.expiresAt} is null or ${notices.expiresAt} > ${now.toISOString()}`))
      .orderBy(desc(notices.createdAt))
      .limit(50),
  ]);

  async function sectionsQuery() {
    return db.select().from(sections).orderBy(sections.name);
  }

  const myClassIds =
    user.role === "teacher"
      ? (await db.select().from(classSubjects).where(eq(classSubjects.teacherId, user.teacherId!))).map((r) => r.classId)
      : [];

  return (
    <>
      <PageHead title="Notices & Announcements" sub="School-wide and class-specific announcements">
        {canPublish && (
          <FormModal title="Publish notice" icon="plus" label="Publish notice" wide>
            <form action={publishNotice} className="space-y-4">
              <Field label="Title *">
                <input name="title" required className="inp" placeholder="e.g. Parent-Teacher Meeting on Saturday" />
              </Field>
              <Field label="Description *">
                <textarea name="body" required rows={4} className="inp resize-y" placeholder="Write the announcement…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <select name="priority" defaultValue="normal" className="inp">
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                  </select>
                </Field>
                <Field label="Expiry (optional)">
                  <input name="expiresAt" type="date" className="inp" />
                </Field>
              </div>
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Scope">
                    <select name="classId" defaultValue="" className="inp">
                      <option value="">Whole school</option>
                      {allClasses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Section (optional)">
                    <select name="sectionId" defaultValue="" className="inp">
                      <option value="">All</option>
                      {allSections.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <Field label="Class (your assigned classes only)">
                  <select name="classId" defaultValue="" className="inp">
                    <option value="">Whole school</option>
                    {allClasses.filter((c) => myClassIds.includes(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="flex justify-end gap-2">
                <ModalCancel />
                <button className="btn-primary"><Icon name="bell" className="w-4 h-4" /> Publish</button>
              </div>
            </form>
          </FormModal>
        )}
      </PageHead>

      {list.length === 0 ? (
        <div className="card">
          <Empty icon="bell" title="No notices" sub="Published announcements will appear here." />
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const isNew = new Date(r.n.createdAt) >= cutoff;
            const important = r.n.priority === "important";
            return (
              <div key={r.n.id} className={`card p-5 fade-up ${important ? "border-saffron/50 bg-saffron-soft/30" : ""}`}>
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${important ? "bg-saffron text-white" : "bg-forest-soft text-forest"}`}>
                    <Icon name={important ? "alert" : "bell"} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-ink">{r.n.title}</h3>
                      {important && <Badge tone="amber">Important</Badge>}
                      {isNew && <Badge tone="green">New</Badge>}
                      {r.className ? <Badge tone="blue">{r.className}</Badge> : <Badge tone="gray">Whole school</Badge>}
                    </div>
                    <p className="text-sm text-inksoft mt-1.5 whitespace-pre-line">{r.n.body}</p>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <span className="text-[11px] text-muted">
                        {r.by ?? "—"} · {fmtDate(r.n.createdAt)}
                        {r.n.expiresAt ? ` · expires ${fmtDate(r.n.expiresAt)}` : ""}
                      </span>
                      {isAdmin && (
                        <ConfirmButton action={deleteNotice} icon="trash" title="Delete" message={`Delete “${r.n.title}”?`} confirmText="Delete" fields={[{ name: "id", value: String(r.n.id) }]} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
