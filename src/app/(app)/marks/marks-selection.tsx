"use client";

import { useMemo, useState } from "react";

type ExamOption = {
  id: number;
  name: string;
  year: string;
  status: string;
};

type SubjectOption = {
  id: number;
  examId: number;
  classId: number;
  className: string;
  subjectName: string;
  fullMarks: number;
  practicalMarks: number;
  passMarks: number;
};

export default function MarksSelection({
  exams,
  rows,
  activeExamId,
  selectedSubjectId,
}: {
  exams: ExamOption[];
  rows: SubjectOption[];
  activeExamId: number | null;
  selectedSubjectId: number | null;
}) {
  const [examId, setExamId] = useState(String(activeExamId ?? ""));
  const [classId, setClassId] = useState(() => {
    const selected = rows.find((row) => row.id === selectedSubjectId);
    return String(selected?.classId ?? rows[0]?.classId ?? "");
  });
  const [subjectId, setSubjectId] = useState(String(selectedSubjectId ?? rows[0]?.id ?? ""));

  const classes = useMemo(() => {
    const unique = new Map<number, string>();
    rows.forEach((row) => unique.set(row.classId, row.className));
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [rows]);

  const availableSubjects = rows.filter((row) => String(row.classId) === classId);

  function changeClass(value: string) {
    setClassId(value);
    const firstSubject = rows.find((row) => String(row.classId) === value);
    setSubjectId(String(firstSubject?.id ?? ""));
  }

  return (
    <form method="GET" action="/marks" className="card p-4 sm:p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-forest-soft text-forest flex items-center justify-center">
          <span className="text-lg">📋</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink">Select examination, class and subject</h3>
          <p className="text-xs text-muted">Choose a class first, then select its subject.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="lbl">Examination</label>
          <select
            name="exam"
            value={examId}
            onChange={(event) => {
              setExamId(event.target.value);
              setSubjectId("");
            }}
            className="inp"
          >
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} · {exam.year} {exam.status === "completed" ? "(completed)" : "(scheduled)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="lbl">Class</label>
          <select
            name="classId"
            value={classId}
            onChange={(event) => changeClass(event.target.value)}
            className="inp"
            disabled={classes.length === 0}
          >
            {classes.length === 0 && <option value="">No classes available</option>}
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="lbl">Subject</label>
          <select
            name="examSubjectId"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="inp"
            disabled={availableSubjects.length === 0}
          >
            {availableSubjects.length === 0 && <option value="">No subjects available</option>}
            {availableSubjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectName} (Full {item.fullMarks})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button type="submit" className="btn-primary" disabled={!subjectId}>
          Load selection
        </button>
      </div>
    </form>
  );
}
