"use client";

import { useEffect, useRef } from "react";
import TransitionLink from "@/components/TransitionLink";
import type { Project } from "@/lib/content";
import { Flip, gsap } from "@/lib/gsap";
import { prefersReducedMotion, useIsoLayoutEffect } from "@/lib/hooks";
import { pad } from "@/lib/format";
import { lenisStore } from "@/lib/store";
import s from "./garage.module.css";
import { workHref } from "@/lib/routes";

type Props = {
  project: Project;
  index: number;
  total: number;
  source: HTMLElement | null;
  onClose: () => void;
  onNext: () => void;
};

/** Full-screen case file. Opens with a Flip from the row it came from and returns to it. */
export default function CaseOverlay({ project, index, total, source, onClose, onNext }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  // Open: panel flips from the row's rectangle to full screen, then the content rises.
  useIsoLayoutEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) return;
    const reduced = prefersReducedMotion();
    const items = content.querySelectorAll("[data-rise]");

    if (reduced || !source) {
      gsap.set(items, { opacity: 1 });
      return;
    }

    const state = Flip.getState(source);
    const tl = gsap.timeline();
    gsap.set(items, { yPercent: 40, opacity: 0 });
    tl.add(Flip.from(state, { targets: panel, duration: 0.85, ease: "expo.inOut", scale: true, absolute: true }));
    tl.to(items, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "expo.out" }, "-=0.3");
    return () => {
      tl.kill();
    };
  }, [project.id]);

  useEffect(() => {
    const lenis = lenisStore.get();
    lenis?.stop();
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && rootRef.current) {
        const focusables = rootRef.current.querySelectorAll<HTMLElement>("button, a[href]");
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
      previous?.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (closing.current) return;
    closing.current = true;
    const panel = panelRef.current;
    const content = contentRef.current;
    if (prefersReducedMotion() || !panel || !content || !source) {
      onClose();
      return;
    }
    gsap
      .timeline({ onComplete: onClose })
      .to(content.querySelectorAll("[data-rise]"), { opacity: 0, yPercent: -20, duration: 0.25, stagger: 0.02, ease: "power2.in" })
      .add(Flip.fit(panel, source, { duration: 0.7, ease: "expo.inOut", scale: true }) as gsap.core.Tween)
      .to(rootRef.current, { opacity: 0, duration: 0.2 }, "-=0.1");
  }

  return (
    <div
      ref={rootRef}
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-title"
      data-theme="ink"
    >
      <div ref={panelRef} className={s.overlayPanel} />
      <div ref={contentRef} className={s.overlayContent} data-lenis-prevent="">
        <div className={`label ${s.overlayBar}`} data-rise="">
          <span>
            Case file · {pad(index + 1)} / {pad(total)}
          </span>
          <button ref={closeRef} type="button" className={`label ${s.close}`} onClick={close} data-cursor="CLOSE">
            Close <kbd>Esc</kbd>
          </button>
        </div>

        <h2 id="case-title" className={`display ${s.caseTitle}`} data-rise="">
          {project.title}
        </h2>

        <div className={s.caseGrid}>
          <div className={s.caseCopy} data-rise="">
            {project.line ? (
              <p className={s.caseLine}>{project.line}</p>
            ) : (
              <p className={s.caseLine}>
                <span className={s.pending}>Write-up pending.</span>
              </p>
            )}
            <div className={s.caseTags}>
              {project.tags.map((t) => (
                <span key={t} className={`label ${s.chip}`}>
                  {t}
                </span>
              ))}
            </div>
            <dl className={s.caseMeta}>
              <div>
                <dt className="label">Status</dt>
                {/* TODO: replace with the real case study (problem, build, outcome). */}
                <dd className="label">Full case study: TODO</dd>
              </div>
              <div>
                <dt className="label">Class</dt>
                <dd className="label">{project.flagship ? "Flagship build" : "Also in the garage"}</dd>
              </div>
            </dl>
          </div>

          {/* TODO: add media */}
          <div className={`placeholder ${s.caseMedia}`} data-rise="">
            <span className="placeholder__tag">
              Media slot · {project.title}
              <br />
              TODO: add media
            </span>
          </div>
        </div>

        <div className={s.overlayActions} data-rise="">
          <TransitionLink href={workHref(project.id)} label={project.title} className={`label ${s.nextBtn}`} data-cursor="OPEN">
            Full case file <span aria-hidden="true">↗</span>
          </TransitionLink>
          <button type="button" className={`label ${s.ghostBtn}`} onClick={onNext} data-cursor="NEXT">
            Next build <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
