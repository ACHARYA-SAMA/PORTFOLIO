"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import s from "./radio.module.css";

type Props = {
  channel: string;
  org: string;
  orgDetail: string;
  role: string;
  text: string;
  className?: string;
};

const CHAR_MS = 24;

/** A radio transcript that types itself out when it scrolls into view. */
export default function RadioPanel({ channel, org, orgDetail, role, text, className = "" }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const roleRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"idle" | "typing" | "done">("idle");

  useEffect(() => {
    const root = rootRef.current;
    const roleEl = roleRef.current;
    const textEl = textRef.current;
    if (!root || !roleEl || !textEl) return;

    if (prefersReducedMotion()) {
      roleEl.textContent = role;
      textEl.textContent = text;
      setState("done");
      return;
    }

    roleEl.textContent = "";
    textEl.textContent = "";
    let frame = 0;

    const type = () => {
      setState("typing");
      const start = performance.now();
      const total = role.length + text.length;
      const step = () => {
        const n = Math.min(total, Math.floor((performance.now() - start) / CHAR_MS));
        roleEl.textContent = role.slice(0, Math.min(n, role.length));
        textEl.textContent = n > role.length ? text.slice(0, n - role.length) : "";
        if (n < total) frame = requestAnimationFrame(step);
        else setState("done");
      };
      frame = requestAnimationFrame(step);
    };

    const st = ScrollTrigger.create({ trigger: root, start: "top 72%", once: true, onEnter: type });
    return () => {
      st.kill();
      cancelAnimationFrame(frame);
    };
  }, [role, text]);

  return (
    <article ref={rootRef} className={`${s.panel} ${className}`} data-state={state}>
      <header className={`label ${s.panelBar}`}>
        <span className={s.rec}>
          <i aria-hidden="true" /> {channel}
        </span>
        <span className={s.org}>
          {org}
          <span className={s.orgDetail}> · {orgDetail}</span>
        </span>
        <span className={s.bars} aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${-i * 0.11}s` }} />
          ))}
        </span>
      </header>

      <p className="sr-only">
        {org}, {orgDetail}. {role} {text}
      </p>

      {/* The ghost reserves the final size so typing never shifts layout. */}
      <div className={s.transcript} aria-hidden="true">
        <div className={s.ghost}>
          <span className={`display ${s.role}`}>{role}</span>
          <span className={s.text}>{text}</span>
        </div>
        <div className={s.live}>
          <span ref={roleRef} className={`display ${s.role}`}>
            {role}
          </span>
          <span className={s.text}>
            <span ref={textRef}>{text}</span>
            <i className={s.caret} />
          </span>
        </div>
      </div>
    </article>
  );
}
