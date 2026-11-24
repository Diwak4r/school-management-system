import Image from "next/image";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  feePayments,
  feeInvoices,
  students,
  enrollments,
  classes,
  academicYears,
  parentChildren,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSchool } from "@/lib/grading";
import { currentSchoolId } from "@/lib/tenant";
import PrintButton from "@/components/print-button";

export const dynamic = "force-dynamic";

const money = (paisa: number) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(paisa / 100);

export default async function ReceiptPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const schoolId = await currentSchoolId();
  const { id } = await params;
  const paymentId = Number(id);

  if (!Number.isSafeInteger(paymentId) || paymentId < 1) notFound();

  const [payment] = await db
    .select()
    .from(feePayments)
    .where(and(eq(feePayments.id, paymentId), eq(feePayments.schoolId, schoolId)))
    .limit(1);

  if (!payment) notFound();

  const [invoice] = await db
    .select()
    .from(feeInvoices)
    .where(and(eq(feeInvoices.id, payment.invoiceId), eq(feeInvoices.schoolId, schoolId)))
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
          eq(parentChildren.schoolId, schoolId),
        ),
      )
      .limit(1);

    if (!link) notFound();
  }

  if (user.role !== "admin" && user.role !== "student" && user.role !== "parent") {
    notFound();
  }

  const [student, school, year, allPayments] = await Promise.all([
    db.select().from(students).where(and(eq(students.id, invoice.studentId), eq(students.schoolId, schoolId))).limit(1),
    getSchool(schoolId),
    db.select().from(academicYears).where(and(eq(academicYears.id, invoice.academicYearId), eq(academicYears.schoolId, schoolId))).limit(1),
    db.select().from(feePayments).where(and(eq(feePayments.invoiceId, invoice.id), eq(feePayments.schoolId, schoolId))),
  ]);

  if (!student[0]) notFound();

  const enrollment = invoice.enrollmentId
    ? await db.select().from(enrollments).where(and(eq(enrollments.id, invoice.enrollmentId), eq(enrollments.schoolId, schoolId))).limit(1)
    : [];

  const classRow = enrollment[0]
    ? await db.select().from(classes).where(and(eq(classes.id, enrollment[0].classId), eq(classes.schoolId, schoolId))).limit(1)
    : [];

  const totalPaid = allPayments.reduce((sum, row) => sum + row.amountPaisa, 0);
  const balance = Math.max(0, invoice.totalPaisa - totalPaid);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
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

        <div className="py-6 text-center">
          <h2 className="text-2xl font-bold tracking-wide">PAYMENT RECEIPT</h2>
          <p className="text-sm text-gray-600">Official Fee Payment Acknowledgement</p>
        </div>

        <div className="rounded-lg border border-gray-300 p-5">
          <div className="flex justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-xs text-gray-500">Receipt Number</p>
              <p className="text-lg font-bold">{payment.receiptNo}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Payment Date</p>
              <p className="font-semibold">{new Date(payment.paidAt).toLocaleString("en-GB")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-5 text-sm">
            <p><strong>Student:</strong> {student[0].name}</p>
            <p><strong>Admission No:</strong> {student[0].admissionNo}</p>
            <p><strong>Class:</strong> {classRow[0]?.name ?? "—"}</p>
            <p><strong>Academic Year:</strong> {year[0]?.name ?? "—"}</p>
            <p><strong>Invoice No:</strong> {invoice.invoiceNo}</p>
            <p><strong>Payment Method:</strong> {payment.paymentMethod}</p>
            {payment.transactionRef && (
              <p className="col-span-2"><strong>Transaction Reference:</strong> {payment.transactionRef}</p>
            )}
          </div>

          <div className="border-y py-6 text-center">
            <p className="text-sm text-gray-500">Amount Received</p>
            <p className="text-3xl font-bold text-green-700">{money(payment.amountPaisa)}</p>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <p className="flex justify-between"><span>Invoice Total</span><strong>{money(invoice.totalPaisa)}</strong></p>
            <p className="flex justify-between"><span>Total Paid (including this receipt)</span><strong>{money(totalPaid)}</strong></p>
            <p className="flex justify-between border-t pt-2 text-base"><span>Remaining Balance</span><strong>{money(balance)}</strong></p>
          </div>

          {payment.notes && <p className="mt-5 text-sm"><strong>Remarks:</strong> {payment.notes}</p>}
        </div>

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm">
          <div className="border-t border-gray-500 pt-2">Cashier / Received By</div>
          <div className="border-t border-gray-500 pt-2">Authorized Signature</div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">Thank you for your payment.</p>
        <p className="mt-1 text-center text-xs text-gray-500">This is a computer-generated receipt.</p>
      </section>
    </main>
  );
}

