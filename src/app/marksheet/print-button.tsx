
"use client";

import { Icon } from "@/components/ui";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary"
    >
      <Icon name="printer" className="w-4 h-4" />
      Print / Save as PDF
    </button>
  );
}
