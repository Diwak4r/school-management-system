import Image from "next/image";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  feeInvoices,
  feeInvoiceItems,
  feePayments,
  students,
  enrollments,
  classes,
  academicYears,
  parentChildren,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSchool } from "@/lib/grading";
import PrintButton from "@/components/print-button";

export const dynamic = "force-dynamic";

const money = (paisa: number) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(paisa / 100);

const dateText = (value: string | Date) =>
  (value instanceof Date ? value : new Date(value)).toLocaleDateString("en-GB");

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isSafeInteger(invoiceId) || invoiceId < 1) notFound();

  const [invoice] = await db
    .select()
    .from(feeInvoices)
    .where(eq(feeInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) notFound();

  if (user.role === "student" && user.studentId !== invoice.studentId) notFound();

  if (user.role === "parent") {
    const [link] = await db
      .select()
      .from(parentChildren)
      .where(
        and(
          eq(parentChildren.userId, user.id),
          eq(parentChildren.studentId, invoice.studentId),
        ),
      )
      .limit(1);

    if (!link) notFound();
  }

  if (user.role !== "admin" && user.role !== "student" && user.role !== "parent") {
    notFound();
  }

  const [student, school, year, items, payments] = await Promise.all([
    db.select().from(students).where(eq(students.id, invoice.studentId)).limit(1),
    getSchool(),
    db.select().from(academicYears).where(eq(academicYears.id, invoice.academicYearId)).limit(1),
    db.select().from(feeInvoiceItems).where(eq(feeInvoiceItems.invoiceId, invoiceId)),
    db.select().from(feePayments).where(eq(feePayments.invoiceId, invoiceId)),
  ]);

  if (!student[0]) notFound();

  const enrollment = invoice.enrollmentId
    ? await db.select().from(enrollments).where(eq(enrollments.id, invoice.enrollmentId)).limit(1)
    : [];

  const classRow = enrollment[0]
    ? await db.select().from(classes).where(eq(classes.id, enrollment[0].classId)).limit(1)
    : [];

  const paid = payments.reduce((sum, payment) => sum + payment.amountPaisa, 0);
  const balance = Math.max(0, invoice.totalPaisa - paid);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-sheet { border: 0 !important; box-shadow: none !important; }
          main { max-width: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print mb-5 flex justify-end">
        <PrintButton />
      </div>

      <section className="print-sheet rounded-xl border border-gray-300 bg-white p-6 sm:p-10 text-gray-900 shadow-sm">
        <header className="flex items-center justify-between gap-4 border-b-2 border-gray-800 pb-5">
          <div>
            <h1 className="text-xl font-bold">{school.name}</h1>
            {school.nameNp && <p className="font-semibold">{school.nameNp}</p>}
            <p className="text-sm">{school.address}</p>
            <p className="text-sm">Contact: {school.contact}</p>
            <p className="text-sm">{school.email}</p>
            <p className="text-sm">{school.website}</p>
          </div>
          {school.logoUrl && (
            <Image src={school.logoUrl} alt="School logo" width={80} height={80} unoptimized className="h-20 w-20 object-contain" />
          )}
        </header>

        <div className="py-5 text-center">
          <h2 className="text-2xl font-bold tracking-wide">FEE INVOICE</h2>
          <p className="text-sm text-gray-600">Student Fee Bill</p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b pb-5 text-sm">
          <div>
            <p><strong>Invoice No:</strong> {invoice.invoiceNo}</p>
            <p><strong>Issue Date:</strong> {dateText(invoice.issueDate)}</p>
            <p><strong>Due Date:</strong> {dateText(invoice.dueDate)}</p>
          </div>
          <div>
            <p><strong>Academic Year:</strong> {year[0]?.name ?? "—"}</p>
            <p><strong>Class:</strong> {classRow[0]?.name ?? "—"}</p>
            <p><strong>Status:</strong> {balance <= 0 ? "Paid" : paid > 0 ? "Partially Paid" : invoice.status}</p>
          </div>
        </div>

        <div className="py-5">
          <h3 className="mb-3 font-bold">Student Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p><strong>Name:</strong> {student[0].name}</p>
            <p><strong>Admission No:</strong> {student[0].admissionNo}</p>
            <p><strong>Father&apos;s Name:</strong> {student[0].fatherName || "—"}</p>
            <p><strong>Contact:</strong> {student[0].contact || "—"}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Amount</th>
                <th className="border p-2 text-right">Discount</th>
                <th className="border p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border p-2">{item.description}</td>
                  <td className="border p-2 text-right">{money(item.amountPaisa)}</td>
                  <td className="border p-2 text-right">{money(item.discountPaisa)}</td>
                  <td className="border p-2 text-right">{money(item.totalPaisa)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="border p-3 text-center">No invoice items available</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-5 max-w-xs space-y-2 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><strong>{money(invoice.subtotalPaisa)}</strong></p>
          <p className="flex justify-between"><span>Discount</span><strong>{money(invoice.discountPaisa)}</strong></p>
          <p className="flex justify-between border-t pt-2 text-base"><span>Total Amount</span><strong>{money(invoice.totalPaisa)}</strong></p>
          <p className="flex justify-between text-green-700"><span>Total Paid</span><strong>{money(paid)}</strong></p>
          <p className="flex justify-between border-t pt-2 text-base text-red-700"><span>Balance Due</span><strong>{money(balance)}</strong></p>
        </div>

        {invoice.notes && <p className="mt-5 text-sm"><strong>Notes:</strong> {invoice.notes}</p>}

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm">
          <div className="border-t border-gray-500 pt-2">Parent / Guardian Signature</div>
          <div className="border-t border-gray-500 pt-2">Authorized Signature</div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">This is a computer-generated fee invoice.</p>
      </section>
    </main>
  );
}


