
"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary"
      type="button"
    >
      🖨 Print / Save as PDF
    </button>
  );
}
