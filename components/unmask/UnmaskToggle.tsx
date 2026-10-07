"use client";

import s from "./unmask.module.css";

type Props = { locked: boolean; onToggle: () => void };

/** Small black plate with a physical sliding switch: UNMASK / LOCK. */
export default function UnmaskToggle({ locked, onToggle }: Props) {
  return (
    <button
      type="button"
      className={s.toggle}
      aria-pressed={locked}
      aria-label={locked ? "Locked open. Press to reset the reveal." : "Lock the reveal open"}
      data-cursor={locked ? "RESET" : "LOCK"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <i className={s.toggleRivet} aria-hidden="true" />
      <span className={`label ${s.toggleLabel}`} data-on={!locked}>
        Unmask
      </span>
      <span className={s.track} aria-hidden="true">
        <span className={s.knob} />
      </span>
      <span className={`label ${s.toggleLabel}`} data-on={locked}>
        Lock
      </span>
      <i className={s.toggleRivet} aria-hidden="true" />
    </button>
  );
}
