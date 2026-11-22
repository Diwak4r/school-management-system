# Fix-SchoolManagement.ps1
# Run from the project root in PowerShell 7 or Windows PowerShell 5.1.
# Creates timestamped backups before changing files. Does not touch .env files or database data.

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$required = @(
  "src/app/(app)/layout.tsx",
  "src/app/api/data/route.ts",
  "src/app/api/upload/route.ts",
  "src/app/(app)/fees/page.tsx",
  "src/db/schema.ts"
)
foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $file))) {
    throw "Run this script from the project root. Missing: $file"
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $root "project-fix-backups\$stamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$backedUp = @{}

function Normalize-Lf([string]$Text) {
  return $Text.Replace("`r`n", "`n")
}
function Read-ProjectFile([string]$RelativePath) {
  return Normalize-Lf ([System.IO.File]::ReadAllText((Join-Path $root $RelativePath)))
}
function Write-ProjectFile([string]$RelativePath, [string]$Content) {
  $Content = Normalize-Lf $Content
  $full = Join-Path $root $RelativePath
  if (-not $backedUp.ContainsKey($RelativePath)) {
    $dest = Join-Path $backupRoot $RelativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
    Copy-Item -LiteralPath $full -Destination $dest
    $backedUp[$RelativePath] = $true
  }
  [System.IO.File]::WriteAllText($full, $Content, [System.Text.UTF8Encoding]::new($false))
}
function Replace-Exact([string]$RelativePath, [string]$Old, [string]$New, [string]$Description) {
  $Old = Normalize-Lf $Old
  $New = Normalize-Lf $New
  $content = Read-ProjectFile $RelativePath
  if ($content.Contains($New)) {
    Write-Host "Already applied: $Description" -ForegroundColor DarkYellow
    return
  }
  if (-not $content.Contains($Old)) {
    throw "Patch stopped: expected source text not found for '$Description' in $RelativePath. No later patches were applied."
  }
  Write-ProjectFile $RelativePath ($content.Replace($Old, $New))
  Write-Host "Applied: $Description" -ForegroundColor Green
}

# 1) Correct the mobile app shell: mobile header above content, desktop sidebar beside content.
Replace-Exact "src/app/(app)/layout.tsx" `
  '<div className="flex min-h-screen bg-paper">' `
  '<div className="flex min-h-screen flex-col lg:flex-row bg-paper">' `
  "Responsive app shell layout"

# 2) Prevent deleted students from receiving new invoices; reject amounts rounding to zero paisa.
Replace-Exact "src/app/(app)/fees/page.tsx" `
  'import { and, desc, eq, inArray, sql } from "drizzle-orm";' `
  'import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";' `
  "Fee page isNull import"
Replace-Exact "src/app/(app)/fees/page.tsx" `
  '.where(eq(students.id, studentId)).limit(1);' `
  '.where(and(eq(students.id, studentId), isNull(students.deletedAt))).limit(1);' `
  "Block invoices for deleted students"
Replace-Exact "src/app/(app)/fees/page.tsx" `
  'if (!Number.isSafeInteger(amountPaisa)) {' `
  'if (!Number.isSafeInteger(amountPaisa) || amountPaisa <= 0) {' `
  "Reject fee amounts below one paisa"

# 3) Use a real PostgreSQL transaction and row lock for fee collection.
$poolFile = "src/lib/fee-payment-pool.ts"
if (-not (Test-Path -LiteralPath (Join-Path $root $poolFile))) {
  $poolContent = @'
import { Pool } from "pg";

const globalForFeePool = globalThis as unknown as {
  feePaymentPool?: Pool;
};

const pool =
  globalForFeePool.feePaymentPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForFeePool.feePaymentPool = pool;
}

export { pool as feePaymentPool };
'@
  $poolFull = Join-Path $root $poolFile
  New-Item -ItemType Directory -Path (Split-Path -Parent $poolFull) -Force | Out-Null
  [System.IO.File]::WriteAllText($poolFull, $poolContent, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Created: PostgreSQL transaction pool" -ForegroundColor Green
}

$feesPath = "src/app/(app)/fees/page.tsx"
$fees = Read-ProjectFile $feesPath
if (-not $fees.Contains('import { feePaymentPool } from "@/lib/fee-payment-pool";')) {
  if (-not $fees.Contains('import { redirect } from "next/navigation";')) {
    throw "Cannot safely add fee payment pool import: import anchor not found."
  }
  $fees = $fees.Replace(
    'import { redirect } from "next/navigation";',
    'import { redirect } from "next/navigation";' + "`r`n" + 'import { feePaymentPool } from "@/lib/fee-payment-pool";'
  )
}
$oldPaymentBlock = @'
  const [invoice] = await db.select().from(feeInvoices)
    .where(eq(feeInvoices.id, invoiceId)).limit(1);

  if (!invoice) await flashTo("/fees", "Invoice not found.", true);

  const [paidRow] = await db.select({
    total: sql<number>`coalesce(sum(${feePayments.amountPaisa}), 0)::int`,
  }).from(feePayments).where(eq(feePayments.invoiceId, invoiceId));

  const paid = Number(paidRow?.total ?? 0);
  const balance = invoice.totalPaisa - paid;

  if (balance <= 0) await flashTo("/fees", "This invoice is already fully paid.", true);
  if (amountPaisa > balance) {
    await flashTo("/fees", `Payment exceeds the outstanding balance of ${money(balance)}.`, true);
  }

  const receiptNo = `RCT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

  await db.insert(feePayments).values({
    invoiceId,
    receiptNo,
    amountPaisa,
    paymentMethod,
    transactionRef: transactionRef || null,
    receivedById: user.id,
  });

  const newPaid = paid + amountPaisa;
  await db.update(feeInvoices).set({
    status: newPaid >= invoice.totalPaisa ? "paid" : "partial",
  }).where(eq(feeInvoices.id, invoiceId));
'@
$oldPaymentBlock = Normalize-Lf $oldPaymentBlock
$newPaymentBlock = @'
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
'@
$newPaymentBlock = Normalize-Lf $newPaymentBlock
if ($fees.Contains($newPaymentBlock)) {
  Write-Host "Already applied: concurrency-safe fee collection" -ForegroundColor DarkYellow
} elseif (-not $fees.Contains($oldPaymentBlock)) {
  throw "Could not safely locate the original fee payment block. No further patches were applied."
} else {
  $fees = $fees.Replace($oldPaymentBlock, $newPaymentBlock)
  Write-ProjectFile $feesPath $fees
  Write-Host "Applied: concurrency-safe fee collection with row locking" -ForegroundColor Green
}

# 4) Fix invoice date typing and normalize fee print-component imports.
$invoicePrint = "src/app/(app)/fees/invoices/[id]/page.tsx"
if (Test-Path -LiteralPath (Join-Path $root $invoicePrint)) {
  $oldDateHelper = @'
const dateText = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB");
'@
  $newDateHelper = @'
const dateText = (value: string | Date) =>
  (value instanceof Date ? value : new Date(value)).toLocaleDateString("en-GB");
'@
  Replace-Exact $invoicePrint $oldDateHelper $newDateHelper "Invoice date helper type safety"
}
$receiptPrint = "src/app/(app)/fees/receipts/[id]/page.tsx"
if (Test-Path -LiteralPath (Join-Path $root $receiptPrint)) {
  Replace-Exact $invoicePrint `
    'import PrintButton from "@/components/PrintButton";' `
    'import PrintButton from "@/components/print-button";' `
    "Invoice print component import"
  Replace-Exact $receiptPrint `
    'import PrintButton from "@/components/PrintButton";' `
    'import PrintButton from "@/components/print-button";' `
    "Receipt print component import"
}
# Keep the existing print component file in place. Imports above use its canonical
# lower-case path; no case-only file is deleted because Windows paths are case-insensitive.

# 5) Add the five fee tables to backups and make restores dependency-aware and transactional.
$dataPath = "src/app/api/data/route.ts"
$data = Read-ProjectFile $dataPath
$schemaImportAnchor = '  auditLogs,' 
if (-not $data.Contains('  feePayments,')) {
  Replace-Exact $dataPath $schemaImportAnchor `
    "  auditLogs,`r`n  sessions,`r`n  feeCategories,`r`n  feeStructures,`r`n  feeInvoices,`r`n  feeInvoiceItems,`r`n  feePayments," `
    "Import sessions and fee tables for backup/restore"
}
$backupAnchor = '      ["audit_logs", auditLogs],' 
if (-not $data.Contains('["fee_payments", feePayments]')) {
  $backupReplacement = @'
      ["audit_logs", auditLogs],
      ["fee_categories", feeCategories],
      ["fee_structures", feeStructures],
      ["fee_invoices", feeInvoices],
      ["fee_invoice_items", feeInvoiceItems],
      ["fee_payments", feePayments],
'@
  Replace-Exact $dataPath $backupAnchor $backupReplacement "Include all fee tables in backup exports"
}

$data = Read-ProjectFile $dataPath
$restorePattern = '(?s)  const order: \[string, any\]\[\] = \[.*?  return NextResponse\.json\(\s*\{ ok: true, tables \},\s*\{ headers: \{ "Cache-Control": "private, no-store" \} \}\s*\);\s*\}'
$restoreReplacement = @'
  // Session tokens are deliberately not backed up; invalidate all current sessions on restore.
  const deleteOrder: [string, any][] = [
    ["fee_payments", feePayments],
    ["fee_invoice_items", feeInvoiceItems],
    ["fee_invoices", feeInvoices],
    ["fee_structures", feeStructures],
    ["fee_categories", feeCategories],
    ["marks", marks],
    ["exam_subjects", examSubjects],
    ["attendance", attendance],
    ["enrollments", enrollments],
    ["class_subjects", classSubjects],
    ["parent_children", parentChildren],
    ["notes", notes],
    ["notices", notices],
    ["examinations", examinations],
    ["grading_scale", gradingScale],
    ["settings", settings],
    ["audit_logs", auditLogs],
    ["users", users],
    ["teachers", teachers],
    ["students", students],
    ["subjects", subjects],
    ["sections", sections],
    ["classes", classes],
    ["academic_years", academicYears],
  ];

  const insertOrder: [string, any][] = [
    ["academic_years", academicYears],
    ["classes", classes],
    ["sections", sections],
    ["subjects", subjects],
    ["students", students],
    ["teachers", teachers],
    ["users", users],
    ["parent_children", parentChildren],
    ["class_subjects", classSubjects],
    ["enrollments", enrollments],
    ["attendance", attendance],
    ["examinations", examinations],
    ["exam_subjects", examSubjects],
    ["marks", marks],
    ["notes", notes],
    ["notices", notices],
    ["grading_scale", gradingScale],
    ["settings", settings],
    ["audit_logs", auditLogs],
    ["fee_categories", feeCategories],
    ["fee_structures", feeStructures],
    ["fee_invoices", feeInvoices],
    ["fee_invoice_items", feeInvoiceItems],
    ["fee_payments", feePayments],
  ];

  const operations: any[] = [db.delete(sessions)];
  const present = new Set<string>();
  let tables = 0;

  for (const [name, table] of deleteOrder) {
    if (Array.isArray(payload.data[name])) {
      operations.push(db.delete(table));
      present.add(name);
      tables++;
    }
  }

  for (const [name, table] of insertOrder) {
    const rows = payload.data[name];
    if (present.has(name) && Array.isArray(rows) && rows.length > 0) {
      operations.push(db.insert(table).values(rows as any));
    }
  }

  // Restore serial counters after explicit IDs are inserted from the backup.
  const sequenceTables = [
    "academic_years", "classes", "sections", "subjects", "students", "teachers",
    "users", "parent_children", "class_subjects", "enrollments", "attendance",
    "examinations", "exam_subjects", "marks", "notes", "notices", "grading_scale",
    "settings", "audit_logs", "fee_categories", "fee_structures", "fee_invoices",
    "fee_invoice_items", "fee_payments", "sessions",
  ];
  for (const tableName of sequenceTables) {
    operations.push(db.execute(sql.raw(
      `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${tableName}"`
    )));
  }

  // Neon HTTP batch executes the statements as one database transaction.
  await db.batch(operations as any);

  return NextResponse.json(
    { ok: true, tables },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
'@
if ($data -match $restorePattern) {
  $regex = [System.Text.RegularExpressions.Regex]::new($restorePattern)
  $data = $regex.Replace($data, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $restoreReplacement }, 1)
  Write-ProjectFile $dataPath $data
  Write-Host "Applied: dependency-ordered transactional backup restore" -ForegroundColor Green
} elseif ($data.Contains("const deleteOrder: [string, any][]")) {
  Write-Host "Already applied: transactional restore" -ForegroundColor DarkYellow
} else {
  throw "Could not safely locate the restore loop in $dataPath."
}

# 6) Validate class/section/subject IDs and teacher assignments before accepting uploads.
$uploadPath = "src/app/api/upload/route.ts"
$upload = Read-ProjectFile $uploadPath
Replace-Exact $uploadPath `
  'import { eq } from "drizzle-orm";' `
  'import { and, eq } from "drizzle-orm";' `
  "Upload route and import"
Replace-Exact $uploadPath `
  'import { notes, academicYears } from "@/db/schema";' `
  'import { notes, academicYears, classes, sections, subjects, classSubjects } from "@/db/schema";' `
  "Upload route schema imports"

$uploadOld = @'
  const dir = path.join(process.cwd(), "public", "uploads");

  await fs.mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(path.join(dir, safeName), buf);

  const classId = fd.get("classId")
    ? Number(fd.get("classId"))
    : null;

  const sectionId = fd.get("sectionId")
    ? Number(fd.get("sectionId"))
    : null;

  const subjectId = fd.get("subjectId")
    ? Number(fd.get("subjectId"))
    : null;

  const [year] = await db
'@
$uploadOld = Normalize-Lf $uploadOld
$uploadNew = @'
  const parseOptionalId = (value: FormDataEntryValue | null): number | null => {
    if (value === null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
  };

  const classId = parseOptionalId(fd.get("classId"));
  const sectionId = parseOptionalId(fd.get("sectionId"));
  const subjectId = parseOptionalId(fd.get("subjectId"));

  if ([classId, sectionId, subjectId].some((value) => Number.isNaN(value))) {
    return NextResponse.json({ error: "Invalid class, section, or subject." }, { status: 400 });
  }

  if ((sectionId || subjectId) && !classId) {
    return NextResponse.json({ error: "Select a class before selecting a section or subject." }, { status: 400 });
  }

  if (classId) {
    const [classRow] = await db.select({ id: classes.id }).from(classes).where(eq(classes.id, classId)).limit(1);
    if (!classRow) return NextResponse.json({ error: "Selected class does not exist." }, { status: 400 });
  }

  if (sectionId) {
    const [sectionRow] = await db.select({ id: sections.id }).from(sections)
      .where(and(eq(sections.id, sectionId), eq(sections.classId, classId!))).limit(1);
    if (!sectionRow) return NextResponse.json({ error: "Selected section does not belong to that class." }, { status: 400 });
  }

  if (subjectId) {
    const [subjectRow] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!subjectRow) return NextResponse.json({ error: "Selected subject does not exist." }, { status: 400 });
  }

  if (user.role === "teacher") {
    if (!user.teacherId || !classId) {
      return NextResponse.json({ error: "Select one of your assigned classes." }, { status: 403 });
    }
    const assignmentConditions = [
      eq(classSubjects.teacherId, user.teacherId),
      eq(classSubjects.classId, classId),
    ];
    if (subjectId) assignmentConditions.push(eq(classSubjects.subjectId, subjectId));
    const [assignment] = await db.select({ id: classSubjects.id }).from(classSubjects)
      .where(and(...assignmentConditions)).limit(1);
    if (!assignment) {
      return NextResponse.json({ error: "You are not assigned to this class/subject." }, { status: 403 });
    }
  }

  const [year] = await db
'@
$uploadNew = Normalize-Lf $uploadNew
$upload = Read-ProjectFile $uploadPath
if (-not $upload.Contains($uploadNew)) {
  if (-not $upload.Contains($uploadOld)) {
    throw "Could not safely locate the upload validation block in $uploadPath."
  }
  $upload = $upload.Replace($uploadOld, $uploadNew)
}
$writeAnchor = @'
  const [row] = await db
    .insert(notes)
'@
$writeAnchor = Normalize-Lf $writeAnchor
$writeReplacement = @'
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(dir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buf);

  let row: { id: number };
  try {
    [row] = await db
      .insert(notes)
'@
$writeReplacement = Normalize-Lf $writeReplacement
if ($upload.Contains($writeAnchor)) {
  $upload = $upload.Replace($writeAnchor, $writeReplacement)
  $tailOld = @'
    .returning({ id: notes.id });

  await logAudit(
'@
  $tailNew = @'
      .returning({ id: notes.id });
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }

  await logAudit(
'@
  $tailOld = Normalize-Lf $tailOld
  $tailNew = Normalize-Lf $tailNew
  if (-not $upload.Contains($tailOld)) { throw "Could not safely add upload cleanup handler." }
  $upload = $upload.Replace($tailOld, $tailNew)
  Write-ProjectFile $uploadPath $upload
  Write-Host "Applied: upload scope validation and orphan-file cleanup" -ForegroundColor Green
} elseif ($upload.Contains("const parseOptionalId")) {
  Write-Host "Already applied: upload validation" -ForegroundColor DarkYellow
} else {
  throw "Could not safely patch upload write sequence."
}

# 7) Add horizontal scrolling to tables on pages identified in the audit.
$responsiveFiles = @(
  "src/app/(app)/academic-years/page.tsx",
  "src/app/(app)/classes/page.tsx",
  "src/app/(app)/dashboard/page.tsx",
  "src/app/(app)/examinations/page.tsx",
  "src/app/(app)/reports/page.tsx",
  "src/app/(app)/results/page.tsx"
)
foreach ($rel in $responsiveFiles) {
  $full = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $full)) { continue }
  $content = Read-ProjectFile $rel
  if ($content -match 'overflow-x-auto') {
    Write-Host "Skipped responsive wrapper (existing overflow wrapper found): $rel" -ForegroundColor DarkYellow
    continue
  }
  $tableRegex = [System.Text.RegularExpressions.Regex]::new('<table\b[\s\S]*?</table>')
  $updated = $tableRegex.Replace($content, [System.Text.RegularExpressions.MatchEvaluator]{
    param($m) '<div className="overflow-x-auto">' + $m.Value + '</div>'
  })
  if ($updated -ne $content) {
    Write-ProjectFile $rel $updated
    Write-Host "Applied mobile table scrolling: $rel" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Patch application completed. Backups: $backupRoot" -ForegroundColor Cyan
Write-Host "NEXT: run npm run typecheck, then npm run build. Do NOT restore a backup over live data." -ForegroundColor Yellow
