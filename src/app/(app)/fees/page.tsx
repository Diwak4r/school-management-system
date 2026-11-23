import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  academicYears,
  classes,
  enrollments,
  feeCategories,
  feeStructures,
  feeInvoices,
  feeInvoiceItems,
  feePayments,
  students,
  parentChildren,
} from "@/db/schema";
import { requireUser, requireRole, logAudit } from "@/lib/auth";
import { flashTo } from "@/actions/auth";
import { PageHead, Badge, Field, Empty } from "@/components/ui";
import { redirect } from "next/navigation";
import { feePaymentPool } from "@/lib/fee-payment-pool";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

function money(paisa: number) {
  return `Rs. ${(Number(paisa || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function addFeeCategory(formData: FormData) {
  "use server";
  const user = await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) await flashTo("/fees", "Enter a fee category name.", true);

  const existing = await db.select().from(feeCategories)
    .where(eq(feeCategories.name, name)).limit(1);

  if (existing.length) await flashTo("/fees", "This fee category already exists.", true);

  await db.insert(feeCategories).values({
    name,
    description: description || null,
  });

  await logAudit(user.id, "Created fee category", "fee_category", undefined, name);
  await flashTo("/fees", "Fee category created.");
}

export async function addFeeStructure(formData: FormData) {
  "use server";
  const user = await requireRole("admin");

  const categoryId = Number(formData.get("categoryId"));
  const classId = Number(formData.get("classId"));
  const academicYearId = Number(formData.get("academicYearId"));
  const amount = Number(formData.get("amount"));
  const frequency = String(formData.get("frequency") || "one_time");
  const allowedFrequencies = ["one_time", "monthly", "term", "yearly"];

  if (!allowedFrequencies.includes(frequency)) {
    await flashTo("/fees", "Invalid fee frequency.", true);
  }

  if (
    !Number.isInteger(categoryId) || categoryId <= 0 ||
    !Number.isInteger(classId) || classId <= 0 ||
    !Number.isInteger(academicYearId) || academicYearId <= 0 ||
    !Number.isFinite(amount) || amount <= 0
  ) {
    await flashTo("/fees", "Enter valid fee structure details.", true);
  }

  const amountPaisa = Math.round(amount * 100);

  if (!Number.isSafeInteger(amountPaisa) || amountPaisa <= 0) {
    await flashTo("/fees", "The fee amount is too large.", true);
  }

  const [category] = await db.select().from(feeCategories)
    .where(and(eq(feeCategories.id, categoryId), eq(feeCategories.isActive, true))).limit(1);
  const [schoolClass] = await db.select().from(classes)
    .where(eq(classes.id, classId)).limit(1);
  const [year] = await db.select().from(academicYears)
    .where(eq(academicYears.id, academicYearId)).limit(1);

  if (!category || !schoolClass || !year) {
    await flashTo("/fees", "Invalid category, class, or academic year.", true);
  }

  await db.insert(feeStructures).values({
    categoryId,
    classId,
    academicYearId,
    amountPaisa,
    frequency,
  });

  await logAudit(user.id, "Created fee structure", "fee_structure", undefined, `${category.name}: ${amount}`);
  await flashTo("/fees", "Fee structure created.");
}

export async function createFeeInvoice(formData: FormData) {
  "use server";
  const user = await requireRole("admin");

  const studentId = Number(formData.get("studentId"));
  const structureId = Number(formData.get("structureId"));
  const dueDate = String(formData.get("dueDate") ?? "");

  if (
    !Number.isInteger(studentId) || studentId <= 0 ||
    !Number.isInteger(structureId) || structureId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
  ) {
    await flashTo("/fees", "Enter valid invoice details.", true);
  }

  const [student] = await db.select().from(students)
    .where(and(eq(students.id, studentId), isNull(students.deletedAt))).limit(1);
  const [structure] = await db.select().from(feeStructures)
    .where(and(eq(feeStructures.id, structureId), eq(feeStructures.isActive, true))).limit(1);

  if (!student || !structure) {
    await flashTo("/fees", "Student or fee structure not found.", true);
  }

  const [enrollment] = await db.select().from(enrollments)
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.classId, structure.classId),
      eq(enrollments.academicYearId, structure.academicYearId),
      eq(enrollments.status, "active"),
    )).limit(1);

  if (!enrollment) {
    await flashTo("/fees", "The student is not actively enrolled in the selected class and academic year.", true);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dueDate < today) {
    await flashTo("/fees", "The due date cannot be in the past.", true);
  }

  const invoiceNo = `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  let invoiceId: number;

  const client = await feePaymentPool.connect();

  try {
    await client.query("BEGIN");

    const invoiceResult = await client.query<{ id: number }>(
      `INSERT INTO fee_invoices
        (invoice_no, student_id, enrollment_id, academic_year_id,
         issue_date, due_date, subtotal_paisa, discount_paisa,
         total_paisa, status, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        invoiceNo,
        studentId,
        enrollment.id,
        structure.academicYearId,
        today,
        dueDate,
        structure.amountPaisa,
        0,
        structure.amountPaisa,
        "issued",
        user.id,
      ],
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      throw new Error("Invoice creation failed.");
    }

    invoiceId = invoice.id;

    await client.query(
      `INSERT INTO fee_invoice_items
        (invoice_id, fee_structure_id, category_id, description,
         amount_paisa, discount_paisa, total_paisa)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        invoiceId,
        structure.id,
        structure.categoryId,
        "School fee",
        structure.amountPaisa,
        0,
        structure.amountPaisa,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  await logAudit(user.id, "Created fee invoice", "fee_invoice", invoiceId, invoiceNo);
  await flashTo("/fees", `Invoice ${invoiceNo} created.`);
}

export async function collectFeePayment(formData: FormData) {
  "use server";
  const user = await requireRole("admin");

  const invoiceId = Number(formData.get("invoiceId"));
  const amount = Number(formData.get("amount"));
  const paymentMethod = String(formData.get("paymentMethod") || "cash");
  const transactionRef = String(formData.get("transactionRef") ?? "").trim();

  if (
    !Number.isInteger(invoiceId) || invoiceId <= 0 ||
    !Number.isFinite(amount) || amount <= 0 ||
    !["cash", "bank", "online", "cheque"].includes(paymentMethod)
  ) {
    await flashTo("/fees", "Enter valid payment details.", true);
  }

  const amountPaisa = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountPaisa) || amountPaisa <= 0) {
    await flashTo("/fees", "Invalid payment amount.", true);
  }

  let receiptNo = "";
  let paymentFailure: string | null = null;
  const client = await feePaymentPool.connect();

  try {
    await client.query("BEGIN");

    const invoiceResult = await client.query<{ id: number; total_paisa: number }>(
      "SELECT id, total_paisa FROM fee_invoices WHERE id = $1 FOR UPDATE",
      [invoiceId],
    );
    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      paymentFailure = "Invoice not found.";
      await client.query("ROLLBACK");
    } else {
      const paidResult = await client.query<{ total: string | number }>(
        "SELECT COALESCE(SUM(amount_paisa), 0)::int AS total FROM fee_payments WHERE invoice_id = $1",
        [invoiceId],
      );
      const paid = Number(paidResult.rows[0]?.total ?? 0);
      const balance = Number(invoice.total_paisa) - paid;

      if (balance <= 0) {
        paymentFailure = "This invoice is already fully paid.";
        await client.query("ROLLBACK");
      } else if (amountPaisa > balance) {
        paymentFailure = `Payment exceeds the outstanding balance of ${money(balance)}.`;
        await client.query("ROLLBACK");
      } else {
        receiptNo = `RCT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

        await client.query(
          `INSERT INTO fee_payments
            (invoice_id, receipt_no, amount_paisa, payment_method, transaction_ref, received_by_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, receiptNo, amountPaisa, paymentMethod, transactionRef || null, user.id],
        );

        const newPaid = paid + amountPaisa;
        await client.query(
          "UPDATE fee_invoices SET status = $1 WHERE id = $2",
          [newPaid >= Number(invoice.total_paisa) ? "paid" : "partial", invoiceId],
        );
        await client.query("COMMIT");
      }
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (paymentFailure) {
    await flashTo("/fees", paymentFailure, true);
  }

  await logAudit(user.id, "Collected fee payment", "fee_payment", invoiceId, `${receiptNo}: ${amount}`);
  await flashTo("/fees", `Payment recorded. Receipt: ${receiptNo}`);
}

export default async function FeesPage() {
  const user = await requireUser();

  const [categories, structures, years, schoolClasses] = await Promise.all([
    db.select().from(feeCategories).orderBy(feeCategories.name),
    db.select({
      id: feeStructures.id,
      amountPaisa: feeStructures.amountPaisa,
      frequency: feeStructures.frequency,
      category: feeCategories.name,
      className: classes.name,
      yearName: academicYears.name,
    })
      .from(feeStructures)
      .innerJoin(feeCategories, eq(feeCategories.id, feeStructures.categoryId))
      .innerJoin(classes, eq(classes.id, feeStructures.classId))
      .innerJoin(academicYears, eq(academicYears.id, feeStructures.academicYearId))
      .where(eq(feeStructures.isActive, true))
      .orderBy(desc(feeStructures.id)),
    db.select().from(academicYears).orderBy(desc(academicYears.id)),
    db.select().from(classes).orderBy(classes.sortOrder),
  ]);

  let studentOptions: { id: number; name: string; admissionNo: string }[] = [];
  let visibleStudentIds: number[] | null = null;

  if (user.role === "admin") {
    studentOptions = await db.select({
      id: students.id,
      name: students.name,
      admissionNo: students.admissionNo,
    }).from(students).orderBy(students.name);
  } else if (user.role === "student") {
    if (!user.studentId) redirect("/dashboard");
    visibleStudentIds = [user.studentId];
  } else if (user.role === "parent") {
    const children = await db.select({ studentId: parentChildren.studentId })
      .from(parentChildren).where(eq(parentChildren.userId, user.id));
    visibleStudentIds = children.map((child) => child.studentId);
  } else {
    redirect("/fees/class");
  }

  const invoiceQuery = db.select({
    id: feeInvoices.id,
    invoiceNo: feeInvoices.invoiceNo,
    studentId: feeInvoices.studentId,
    studentName: students.name,
    yearName: academicYears.name,
    issueDate: feeInvoices.issueDate,
    dueDate: feeInvoices.dueDate,
    totalPaisa: feeInvoices.totalPaisa,
    status: feeInvoices.status,
    paidPaisa: sql<number>`coalesce((select sum(${feePayments.amountPaisa}) from ${feePayments} where ${feePayments.invoiceId} = ${feeInvoices.id}), 0)::int`,
  })
    .from(feeInvoices)
    .innerJoin(students, eq(students.id, feeInvoices.studentId))
    .innerJoin(academicYears, eq(academicYears.id, feeInvoices.academicYearId));

  const invoices = user.role === "admin"
    ? await invoiceQuery.orderBy(desc(feeInvoices.createdAt))
    : visibleStudentIds && visibleStudentIds.length > 0
      ? await invoiceQuery.where(inArray(feeInvoices.studentId, visibleStudentIds)).orderBy(desc(feeInvoices.createdAt))
      : [];

  if (user.role !== "admin") {
    const outstanding = invoices.reduce((sum, invoice) =>
      sum + Math.max(0, invoice.totalPaisa - Number(invoice.paidPaisa)), 0);
    const paidTotal = invoices.reduce((sum, invoice) =>
      sum + Number(invoice.paidPaisa), 0);

    return (
      <>
        <PageHead title="My Fees" sub="Your invoices, payments and outstanding balance" />
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="card p-4"><p className="text-xs text-muted">Total invoiced</p><p className="text-xl font-bold">{money(invoices.reduce((s, i) => s + i.totalPaisa, 0))}</p></div>
          <div className="card p-4"><p className="text-xs text-muted">Paid</p><p className="text-xl font-bold text-forest">{money(paidTotal)}</p></div>
          <div className="card p-4"><p className="text-xs text-muted">Outstanding</p><p className="text-xl font-bold text-danger">{money(outstanding)}</p></div>
        </div>
        <div className="card overflow-hidden">
          {invoices.length === 0 ? <Empty icon="file" title="No fee invoices yet" sub="Your fee invoices will appear here when issued by the school." /> : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Invoice</th><th>Academic year</th><th>Issue date</th><th>Due date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>{invoices.map((i) => {
                  const balance = Math.max(0, i.totalPaisa - Number(i.paidPaisa));
                  return <tr key={i.id}>
                    <td className="font-bold">{i.invoiceNo}</td><td>{i.yearName}</td><td>{i.issueDate}</td><td>{i.dueDate}</td>
                    <td>{money(i.totalPaisa)}</td><td>{money(Number(i.paidPaisa))}</td><td className="font-bold">{money(balance)}</td>
                    <td><Badge tone={balance === 0 ? "green" : "amber"}>{balance === 0 ? "Paid" : Number(i.paidPaisa) > 0 ? "Partial" : "Due"}</Badge></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  const [allStudents, paymentRows] = await Promise.all([
    db.select({ id: students.id, name: students.name, admissionNo: students.admissionNo }).from(students).orderBy(students.name),
    db.select({
      id: feePayments.id,
      receiptNo: feePayments.receiptNo,
      invoiceId: feePayments.invoiceId,
      amountPaisa: feePayments.amountPaisa,
      method: feePayments.paymentMethod,
      paidAt: feePayments.paidAt,
    }).from(feePayments).orderBy(desc(feePayments.paidAt)).limit(10),
  ]);

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.totalPaisa, 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidPaisa), 0);
  const totalDue = Math.max(0, totalBilled - totalPaid);

  return (
    <>
      <PageHead title="Fee Management" sub="Manage fee categories, class fee structures, student invoices and payments" />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="card p-4"><p className="text-xs text-muted">Total invoiced</p><p className="text-xl font-bold">{money(totalBilled)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Total collected</p><p className="text-xl font-bold text-forest">{money(totalPaid)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Outstanding</p><p className="text-xl font-bold text-danger">{money(totalDue)}</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <section className="card p-5">
          <h2 className="font-bold mb-3">Add fee category</h2>
          <form action={addFeeCategory} className="space-y-3">
            <Field label="Category name"><input className="inp" name="name" placeholder="Tuition Fee" required /></Field>
            <Field label="Description"><input className="inp" name="description" placeholder="Optional description" /></Field>
            <button className="btn-primary">Add category</button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="font-bold mb-3">Create class fee structure</h2>
          <form action={addFeeStructure} className="space-y-3">
            <Field label="Fee category">
              <select className="inp" name="categoryId" required defaultValue="">
                <option value="" disabled>Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Class">
              <select className="inp" name="classId" required defaultValue="">
                <option value="" disabled>Select class</option>
                {schoolClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Academic year">
              <select className="inp" name="academicYearId" required defaultValue="">
                <option value="" disabled>Select year</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </Field>
            <Field label="Amount (NPR)">
              <input className="inp" name="amount" type="number" min="0.01" step="0.01" required />
            </Field>
            <Field label="Frequency">
              <select className="inp" name="frequency" defaultValue="one_time">
                <option value="one_time">One time</option>
                <option value="monthly">Monthly</option>
                <option value="term">Per term</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
            <button className="btn-primary">Save fee structure</button>
          </form>
        </section>
      </div>

      <section className="card p-5 mb-5">
        <h2 className="font-bold mb-3">Create student invoice</h2>
        <form action={createFeeInvoice} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Field label="Student">
            <select className="inp" name="studentId" required defaultValue="">
              <option value="" disabled>Select student</option>
              {allStudents.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
            </select>
          </Field>
          <Field label="Fee structure">
            <select className="inp" name="structureId" required defaultValue="">
              <option value="" disabled>Select fee structure</option>
              {structures.map((s) => <option key={s.id} value={s.id}>{s.className} · {s.category} · {s.yearName} · {money(s.amountPaisa)}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input className="inp" name="dueDate" type="date" required /></Field>
          <button className="btn-primary">Create invoice</button>
        </form>
      </section>

      <section className="card overflow-hidden mb-5">
        <div className="p-5 pb-2"><h2 className="font-bold">Fee structures</h2></div>
        {structures.length === 0 ? <Empty icon="file" title="No fee structures created" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Category</th><th>Class</th><th>Academic year</th><th>Frequency</th><th>Amount</th></tr></thead>
            <tbody>{structures.map((s) => <tr key={s.id}><td className="font-semibold">{s.category}</td><td>{s.className}</td><td>{s.yearName}</td><td>{s.frequency}</td><td className="font-bold">{money(s.amountPaisa)}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="card overflow-hidden mb-5">
        <div className="p-5 pb-2"><h2 className="font-bold">Student invoices and payment collection</h2></div>
        {invoices.length === 0 ? <Empty icon="file" title="No invoices created yet" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Invoice</th><th>Student</th><th>Year</th><th>Total</th><th>Paid</th><th>Balance</th><th>Collect payment</th></tr></thead>
            <tbody>{invoices.map((i) => {
              const paid = Number(i.paidPaisa);
              const balance = Math.max(0, i.totalPaisa - paid);
              return <tr key={i.id}>
                <td className="font-bold">{i.invoiceNo}<div className="text-xs text-muted">Due {i.dueDate}</div></td>
                <td>{i.studentName}</td><td>{i.yearName}</td><td>{money(i.totalPaisa)}</td><td>{money(paid)}</td>
                <td className="font-bold">{money(balance)}</td>
                <td>{balance > 0 ? (
                  <form action={collectFeePayment} className="flex flex-wrap gap-1.5 min-w-[230px]">
                    <input type="hidden" name="invoiceId" value={i.id} />
                    <input className="inp w-24" name="amount" type="number" min="0.01" max={(balance / 100).toFixed(2)} step="0.01" placeholder="NPR" required />
                    <select className="inp w-24" name="paymentMethod" defaultValue="cash">
                      <option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option><option value="cheque">Cheque</option>
                    </select>
                    <input className="inp w-32" name="transactionRef" placeholder="Ref / cheque no." />
                    <button className="btn-primary btn-sm">Collect</button>
                  </form>
                ) : <Badge tone="green">Fully paid</Badge>}</td>
              </tr>;
            })}</tbody>
          </table></div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="p-5 pb-2"><h2 className="font-bold">Recent payments</h2></div>
        {paymentRows.length === 0 ? <Empty icon="file" title="No payments received yet" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Receipt</th><th>Invoice ID</th><th>Amount</th><th>Method</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>{paymentRows.map((p) => <tr key={p.id}><td className="font-bold">{p.receiptNo}</td><td>{p.invoiceId}</td><td>{money(p.amountPaisa)}</td><td>{p.method}</td><td>{new Date(p.paidAt).toLocaleString()}</td><td><a href={`/fees/receipts/${p.id}`} className="text-blue-600 hover:underline font-semibold">View / Print Receipt</a></td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}


