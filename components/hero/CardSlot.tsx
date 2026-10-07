"use client";

import { useRef, type CSSProperties } from "react";
import { CONTACT } from "@/lib/content";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { playWhoosh } from "@/lib/sound";
import s from "./card.module.css";

export function BankCard() {
  return (
    <>
      <span className={s.chip} />
      <span className={s.brand}>AA</span>
      <span className={s.meta}>
        ARMAN ACHARYA
        <br />
        CSE (DS)
      </span>
    </>
  );
}

type Props = { className?: string; style?: CSSProperties };

/** Red card in a black slot. Click: it drops out of view, comes back, opens the CV. */
export default function CardSlot({ className = "", style }: Props) {
  const card = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  const openCv = () => window.open(CONTACT.cv, "_blank", "noopener,noreferrer");

  const eject = () => {
    if (busy.current || !card.current) return;
    busy.current = true;
    playWhoosh();

    if (prefersReducedMotion()) {
      openCv();
      busy.current = false;
      return;
    }

    gsap
      .timeline({ onComplete: () => void (busy.current = false) })
      .to(card.current, { yPercent: 150, duration: 0.36, ease: "power3.in" })
      .call(openCv, [], "+=0.04")
      .to(card.current, { yPercent: 0, duration: 0.9, ease: "back.out(1.5)" }, "+=0.18");
  };

  return (
    <button
      type="button"
      className={`${s.slot} ${className}`}
      style={style}
      onClick={eject}
      data-cursor="CV ↗"
      aria-label="Open Arman's CV (PDF, new tab)"
    >
      <span className={s.clip}>
        <span className={s.lift}>
          <span ref={card} className={s.card}>
            <BankCard />
          </span>
        </span>
      </span>
      <span className={s.housing}>
        <span className={s.mouth} />
        <span className={s.led} />
        <span className={s.grille} />
        <span className={`label ${s.slotLabel}`}>CV · PDF</span>
      </span>
    </button>
  );
}
