"use client";

/** The browser's own print dialog: "Save as PDF" gives the one-page A4 file. */
export default function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={`label ${className ?? ""}`} onClick={() => window.print()} data-cursor="PDF">
      Download PDF <span aria-hidden="true">↓</span>
    </button>
  );
}
