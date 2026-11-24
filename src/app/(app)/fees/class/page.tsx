import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  academicYears,
  classSubjects,
  classes,
  enrollments,
  feeInvoices,
  feePayments,
  students,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { currentSchoolId } from "@/lib/tenant";

function formatNPR(paisa: number) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paisa / 100);
}

export default async function ClassFeeStatusPage() {
  const user = await requireUser();

  if (user.role !== "teacher" || !user.teacherId) {
    redirect("/dashboard");
  }
  const schoolId = await currentSchoolId();

  // Only classes where this teacher is officially the class teacher.
  const assignedClasses = await db
    .select({
      classId: classSubjects.classId,
      className: classes.name,
    })
    .from(classSubjects)
    .innerJoin(classes, and(eq(classes.id, classSubjects.classId), eq(classes.schoolId, schoolId)))
    .where(
      and(
        eq(classSubjects.teacherId, user.teacherId),
        eq(classSubjects.isClassTeacher, true),
        eq(classSubjects.schoolId, schoolId),
      ),
    );

  const classIds = [...new Set(assignedClasses.map((item) => item.classId))];

  if (classIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Class Fee Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fee information for your assigned classes.
          </p>
        </div>
        <div className="card p-8 text-center">
          <p className="font-medium">No class assigned</p>
          <p className="text-sm text-gray-500 mt-2">
            You are not currently designated as a class teacher.
          </p>
        </div>
      </div>
    );
  }

  // Only active students in the teacher's assigned classes.
  const enrollmentRows = await db
    .select({
      studentId: students.id,
      studentName: students.name,
      admissionNo: students.admissionNo,
      classId: classes.id,
      className: classes.name,
      academicYearId: academicYears.id,
      academicYear: academicYears.name,
      rollNo: enrollments.rollNo,
    })
    .from(enrollments)
    .innerJoin(students, and(eq(students.id, enrollments.studentId), eq(students.schoolId, schoolId)))
    .innerJoin(classes, and(eq(classes.id, enrollments.classId), eq(classes.schoolId, schoolId)))
    .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.schoolId, schoolId)))
    .where(
      and(
        inArray(enrollments.classId, classIds),
        eq(enrollments.status, "active"),
        eq(enrollments.schoolId, schoolId),
      ),
    );

  const studentIds = [...new Set(enrollmentRows.map((row) => row.studentId))];
  const yearIds = [...new Set(enrollmentRows.map((row) => row.academicYearId))];

  const invoiceRows =
    studentIds.length > 0 && yearIds.length > 0
      ? await db
          .select({
            id: feeInvoices.id,
            studentId: feeInvoices.studentId,
            academicYearId: feeInvoices.academicYearId,
            totalPaisa: feeInvoices.totalPaisa,
            status: feeInvoices.status,
          })
          .from(feeInvoices)
          .where(
            and(
              inArray(feeInvoices.studentId, studentIds),
              inArray(feeInvoices.academicYearId, yearIds),
              eq(feeInvoices.schoolId, schoolId),
            ),
          )
      : [];

  const invoiceIds = invoiceRows.map((invoice) => invoice.id);

  const paymentRows =
    invoiceIds.length > 0
      ? await db
          .select({
            invoiceId: feePayments.invoiceId,
            amountPaisa: feePayments.amountPaisa,
          })
          .from(feePayments)
          .where(and(inArray(feePayments.invoiceId, invoiceIds), eq(feePayments.schoolId, schoolId)))
      : [];

  const paidByInvoice = new Map<number, number>();

  for (const payment of paymentRows) {
    paidByInvoice.set(
      payment.invoiceId,
      (paidByInvoice.get(payment.invoiceId) ?? 0) + payment.amountPaisa,
    );
  }

  const feeTotals = new Map<
    string,
    { billed: number; paid: number; due: number; invoices: number }
  >();

  for (const invoice of invoiceRows) {
    const key = `${invoice.studentId}:${invoice.academicYearId}`;
    const paid = paidByInvoice.get(invoice.id) ?? 0;
    const current = feeTotals.get(key) ?? {
      billed: 0,
      paid: 0,
      due: 0,
      invoices: 0,
    };

    current.billed += invoice.totalPaisa;
    current.paid += paid;
    current.due += Math.max(0, invoice.totalPaisa - paid);
    current.invoices += 1;

    feeTotals.set(key, current);
  }

  const rows = enrollmentRows.map((student) => {
    const key = `${student.studentId}:${student.academicYearId}`;
    const fees = feeTotals.get(key) ?? {
      billed: 0,
      paid: 0,
      due: 0,
      invoices: 0,
    };

    return { ...student, ...fees };
  });

  const totalDue = rows.reduce((sum, row) => sum + row.due, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const totalBilled = rows.reduce((sum, row) => sum + row.billed, 0);
  const studentsWithDue = rows.filter((row) => row.due > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Class Fee Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fee overview for students in your assigned classes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Students</p>
          <p className="text-2xl font-bold mt-2">{rows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Billed</p>
          <p className="text-xl font-bold mt-2">{formatNPR(totalBilled)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-xl font-bold mt-2 text-green-700">
            {formatNPR(totalPaid)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Outstanding Due</p>
          <p className="text-xl font-bold mt-2 text-red-600">
            {formatNPR(totalDue)}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold">Student Fee Details</h2>
          <span className="text-sm text-gray-500">
            {studentsWithDue} student(s) with outstanding fees
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No active students found in your assigned classes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Academic Year</th>
                  <th className="text-right">Billed</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.studentId}-${row.academicYearId}`}>
                    <td>
                      <div className="font-medium">{row.studentName}</div>
                      <div className="text-xs text-gray-500">
                        {row.admissionNo}
                        {row.rollNo ? ` · Roll ${row.rollNo}` : ""}
                      </div>
                    </td>
                    <td>{row.className}</td>
                    <td>{row.academicYear}</td>
                    <td className="text-right">{formatNPR(row.billed)}</td>
                    <td className="text-right text-green-700">
                      {formatNPR(row.paid)}
                    </td>
                    <td className="text-right font-semibold">
                      {formatNPR(row.due)}
                    </td>
                    <td>
                      {row.invoices === 0 ? (
                        <span className="text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-600">
                          No invoice
                        </span>
                      ) : row.due === 0 ? (
                        <span className="text-xs rounded-full px-2 py-1 bg-green-100 text-green-700">
                          Paid
                        </span>
                      ) : row.paid > 0 ? (
                        <span className="text-xs rounded-full px-2 py-1 bg-amber-100 text-amber-700">
                          Partial
                        </span>
                      ) : (
                        <span className="text-xs rounded-full px-2 py-1 bg-red-100 text-red-700">
                          Unpaid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
