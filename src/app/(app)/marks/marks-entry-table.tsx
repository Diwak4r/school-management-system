"use client";

import { useMemo, useState } from "react";

type StudentRow = {
  studentId: number;
  name: string;
  rollNo: number | null;
  theory: number | null;
  practical: number | null;
};

type Props = {
  examSubjectId: number;
  rows: StudentRow[];
  theoryFull: number;
  practicalFull: number;
  action: (formData: FormData) => void | Promise<void>;
};

export default function MarksEntryTable({
  examSubjectId,
  rows,
  theoryFull,
  practicalFull,
  action,
}: Props) {
  const [values, setValues] = useState<Record<number, { theory: string; practical: string }>>(
    () =>
      Object.fromEntries(
        rows.map((row) => [
          row.studentId,
          {
            theory: row.theory == null ? "" : String(row.theory),
            practical: row.practical == null ? "" : String(row.practical),
          },
        ])
      )
  );

  const updateMark = (studentId: number, field: "theory" | "practical", value: string) => {
    setValues((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: value,
      },
    }));
  };

  const stats = useMemo(() => {
    let entered = 0;
    let invalid = 0;

    for (const row of rows) {
      const value = values[row.studentId] ?? { theory: "", practical: "" };

      if (value.theory.trim() !== "") {
        entered++;

        const theory = Number(value.theory);
        const practical = value.practical.trim() === "" ? 0 : Number(value.practical);

        if (
          !Number.isInteger(theory) ||
          theory < 0 ||
          theory > theoryFull ||
          !Number.isInteger(practical) ||
          practical < 0 ||
          practical > practicalFull
        ) {
          invalid++;
        }
      } else if (value.practical.trim() !== "") {
        invalid++;
      }
    }

    return { entered, invalid };
  }, [rows, values, theoryFull, practicalFull]);

  return (
    <form action={action}>
      <input type="hidden" name="examSubjectId" value={examSubjectId} />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-line bg-forest-mist/40">
        <div>
          <p className="text-sm font-bold text-ink">Student marks</p>
          <p className="text-xs text-muted mt-0.5">
            Enter marks for each student. Blank theory marks will be skipped.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-white border border-line px-3 py-2 text-inksoft">
            {stats.entered} / {rows.length} entered
          </span>
          {stats.invalid > 0 && (
            <span className="rounded-lg bg-danger-soft text-danger border border-danger/20 px-3 py-2">
              {stats.invalid} invalid
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl min-w-[620px]">
          <thead>
            <tr>
              <th className="w-16 text-center">Roll</th>
              <th>Student name</th>
              <th className="text-center">
                Theory
                <span className="block normal-case tracking-normal font-medium text-muted">
                  Out of {theoryFull}
                </span>
              </th>
              {practicalFull > 0 && (
                <th className="text-center">
                  Practical
                  <span className="block normal-case tracking-normal font-medium text-muted">
                    Out of {practicalFull}
                  </span>
                </th>
              )}
              <th className="text-center">Total / {theoryFull + practicalFull}</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const value = values[row.studentId] ?? { theory: "", practical: "" };
              const theory = value.theory.trim() === "" ? null : Number(value.theory);
              const practical = value.practical.trim() === "" ? 0 : Number(value.practical);

              const theoryInvalid =
                theory !== null &&
                (!Number.isInteger(theory) || theory < 0 || theory > theoryFull);

              const practicalInvalid =
                practicalFull > 0 &&
                value.practical.trim() !== "" &&
                (!Number.isInteger(practical) || practical < 0 || practical > practicalFull);

              const invalid = theoryInvalid || practicalInvalid;
              const total = theory === null || invalid ? null : theory + practical;

              return (
                <tr key={row.studentId} className={index % 2 === 1 ? "bg-paper/30" : ""}>
                  <td className="text-center">
                    <span className="inline-flex min-w-7 justify-center rounded-md bg-paper px-2 py-1 text-xs font-bold text-inksoft">
                      {row.rollNo ?? "—"}
                    </span>
                  </td>

                  <td>
                    <div className="font-semibold text-ink">{row.name}</div>
                    <div className="text-[10px] text-muted">Student ID: {row.studentId}</div>
                  </td>

                  <td className="text-center">
                    <input
                      type="number"
                      name={`t${row.studentId}`}
                      min="0"
                      max={theoryFull}
                      step="1"
                      value={value.theory}
                      onChange={(event) =>
                        updateMark(row.studentId, "theory", event.target.value)
                      }
                      aria-label={`Theory marks for ${row.name}`}
                      aria-invalid={theoryInvalid}
                      className={`inp w-24 mx-auto text-center font-semibold tabular-nums ${
                        theoryInvalid ? "border-danger ring-2 ring-danger/10" : ""
                      }`}
                      placeholder="—"
                    />
                    {theoryInvalid && (
                      <p className="text-[10px] text-danger mt-1">
                        0–{theoryFull} only
                      </p>
                    )}
                  </td>

                  {practicalFull > 0 && (
                    <td className="text-center">
                      <input
                        type="number"
                        name={`p${row.studentId}`}
                        min="0"
                        max={practicalFull}
                        step="1"
                        value={value.practical}
                        onChange={(event) =>
                          updateMark(row.studentId, "practical", event.target.value)
                        }
                        aria-label={`Practical marks for ${row.name}`}
                        aria-invalid={practicalInvalid}
                        className={`inp w-24 mx-auto text-center font-semibold tabular-nums ${
                          practicalInvalid ? "border-danger ring-2 ring-danger/10" : ""
                        }`}
                        placeholder="0"
                      />
                      {practicalInvalid && (
                        <p className="text-[10px] text-danger mt-1">
                          0–{practicalFull} only
                        </p>
                      )}
                    </td>
                  )}

                  <td className="text-center">
                    <span
                      className={`inline-flex min-w-12 justify-center rounded-lg px-3 py-2 text-sm font-extrabold tabular-nums ${
                        total === null
                          ? "bg-paper text-muted"
                          : "bg-forest-soft text-forest"
                      }`}
                    >
                      {total ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-line bg-surface">
        <div className="text-xs text-muted leading-relaxed">
          <p className="font-semibold text-inksoft">
            {stats.entered} student(s) with theory marks
          </p>
          <p>Marks must be whole numbers within the allowed limits.</p>
        </div>

        <button
          type="submit"
          disabled={stats.invalid > 0}
          className="btn-primary px-5 py-2.5 w-full sm:w-auto"
        >
          <span>✓</span>
          Save marks ({stats.entered})
        </button>
      </div>
    </form>
  );
}
