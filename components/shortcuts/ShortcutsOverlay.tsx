"use client";

import { useEffect, useRef } from "react";
import { SITE_SHORTCUTS, WORLD_SHORTCUTS, type Shortcut } from "@/lib/shortcuts";
import PadGlyph from "./PadGlyph";
import s from "./shortcuts.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Which list leads. Both are always listed: the sheet is the map of both modes. */
  mode: "site" | "world";
};

function Rows({ list, pad }: { list: Shortcut[]; pad: boolean }) {
  return (
    <dl className={s.rows}>
      {list.map((sc, i) => (
        <div key={i} className={s.row}>
          <dt className={s.keys}>
            {sc.keys.map((k) => (
              <kbd key={k} className={s.kbd}>
                {k}
              </kbd>
            ))}
            {pad && sc.pad ? (
              <span className={s.pad} aria-hidden="true">
                {sc.pad.map((g) => (
                  <PadGlyph key={g} glyph={g} />
                ))}
              </span>
            ) : null}
          </dt>
          <dd className={s.action}>{sc.action}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The `?` sheet, styled like the machine plate. Esc, `?` or the close button dismiss it. */
export default function ShortcutsOverlay({ open, onClose, mode }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const site = (
    <section className={s.col} aria-labelledby="sc-site">
      <h3 id="sc-site" className={`label ${s.h}`}>
        Portfolio
      </h3>
      <Rows list={SITE_SHORTCUTS} pad={false} />
    </section>
  );
  const world = (
    <section className={s.col} aria-labelledby="sc-world">
      <h3 id="sc-world" className={`label ${s.h}`}>
        World <span className={s.hNote}>keyboard · gamepad</span>
      </h3>
      <Rows list={WORLD_SHORTCUTS} pad />
    </section>
  );

  return (
    <div className={s.scrim} onClick={onClose} data-lenis-prevent="">
      <div className={s.plate} role="dialog" aria-modal="true" aria-labelledby="sc-title" onClick={(e) => e.stopPropagation()}>
        <span className={`${s.rivet} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.rivet} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.rivet} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.rivet} ${s.br}`} aria-hidden="true" />
        <header className={s.top}>
          <h2 id="sc-title" className={`display ${s.title}`}>
            Controls
          </h2>
          <button ref={closeRef} type="button" className={`label ${s.close}`} onClick={onClose}>
            Close <kbd className={s.kbd}>Esc</kbd>
          </button>
        </header>
        <div className={s.cols}>
          {mode === "world" ? (
            <>
              {world}
              {site}
            </>
          ) : (
            <>
              {site}
              {world}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
