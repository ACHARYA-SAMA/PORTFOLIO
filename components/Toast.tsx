"use client";

import { toasts, useStore } from "@/lib/store";

/** Small mono notifications (COPIED, SOUND ON). Visual only: the brief keeps aria-live to the hero caption. */
export default function Toast() {
  const items = useStore(toasts, []);
  return (
    <div className="toasts" aria-hidden="true">
      {items.map((t) => (
        <div key={t.id} className="toast label">
          <span className="toast__dot" />
          {t.text}
        </div>
      ))}
    </div>
  );
}
