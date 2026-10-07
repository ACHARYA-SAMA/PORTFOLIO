"use client";

import { useEffect, useRef, useState } from "react";
import OdometerDrums, { type DrumsHandle } from "@/components/OdometerDrums";
import MagneticButton from "@/components/ui/MagneticButton";
import CardSlot from "@/components/hero/CardSlot";
import { CONTACT, CONTACT_STATUS, chapterNo } from "@/lib/content";
import type { RollOrder } from "@/lib/drums";
import { ScrollTrigger } from "@/lib/gsap";
import { toast } from "@/lib/store";
import s from "./contact.module.css";

const ORDERS: RollOrder[] = ["ltr", "rtl", "center", "random"];

export default function Contact() {
  const lets = useRef<DrumsHandle>(null);
  const talk = useRef<DrumsHandle>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const spins = useRef(0);
  const [copied, setCopied] = useState(false);

  const roll = (extra = 1) => {
    const order = ORDERS[spins.current++ % ORDERS.length];
    void lets.current?.roll("LET'S", { extraTurns: extra, order, stagger: 70 });
    void talk.current?.roll("TALK", { extraTurns: extra, order, stagger: 70, delay: 120 });
  };

  // First roll when the headline arrives.
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const st = ScrollTrigger.create({
      trigger: head,
      start: "top 75%",
      once: true,
      onEnter: () => {
        lets.current?.scramble();
        talk.current?.scramble();
        roll(1);
      },
    });
    return () => st.kill();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      toast("Copied");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${CONTACT.email}`;
    }
  };

  return (
    <section id="contact" className={s.contact} data-theme="asphalt" aria-labelledby="contact-title">
      <div className={s.wrap}>
        <div className={`label ${s.headRow}`}>
          <span>{chapterNo("contact")}</span>
          <span className={s.headKicker}>Pit exit</span>
          <span className={s.headMeta}>Contact</span>
        </div>

        <h2 id="contact-title" className="sr-only">
          Let’s talk
        </h2>
        <div ref={headRef} className={s.headline} aria-hidden="true">
          <OdometerDrums ref={lets} count={5} initial="LET'S" sound className={s.drums} />
          <OdometerDrums ref={talk} count={4} initial="TALK" sound className={`${s.drums} ${s.drumsTalk}`} />
        </div>

        <div className={s.grid}>
          <ul className={s.links}>
            <li className={s.linkRow}>
              <span className={`label ${s.linkKey}`}>Email</span>
              <MagneticButton strength={0.22}>
                <button
                  type="button"
                  className={s.link}
                  onClick={copy}
                  onPointerEnter={() => roll(1)}
                  onFocus={() => roll(1)}
                  data-cursor={copied ? "COPIED" : "COPY"}
                  aria-label={copied ? `Copied ${CONTACT.email}` : `Copy email address ${CONTACT.email}`}
                >
                  {CONTACT.email}
                  <span className={`label ${s.copyState}`} aria-hidden="true">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              </MagneticButton>
            </li>
            <li className={s.linkRow}>
              <span className={`label ${s.linkKey}`}>LinkedIn</span>
              <MagneticButton strength={0.22}>
                <a className={s.link} href={CONTACT.linkedin.href} target="_blank" rel="noopener noreferrer" data-cursor="OPEN">
                  {CONTACT.linkedin.label}
                  <span className={s.arrow} aria-hidden="true">↗</span>
                </a>
              </MagneticButton>
            </li>
            <li className={s.linkRow}>
              <span className={`label ${s.linkKey}`}>GitHub</span>
              <MagneticButton strength={0.22}>
                <a className={s.link} href={CONTACT.github.href} target="_blank" rel="noopener noreferrer" data-cursor="OPEN">
                  {CONTACT.github.label}
                  <span className={s.arrow} aria-hidden="true">↗</span>
                </a>
              </MagneticButton>
            </li>
          </ul>

          <div className={s.cvCol}>
            <span className={`label ${s.linkKey}`}>CV</span>
            <div className={s.cvMachine}>
              <CardSlot className={s.cvSlot} />
            </div>
            <p className={`label ${s.cvHint}`}>Click the card. It drops, comes back, opens the PDF.</p>
          </div>
        </div>

        <p className={`label ${s.status}`}>
          <span className={s.live} aria-hidden="true" />
          {CONTACT_STATUS}
        </p>
      </div>
    </section>
  );
}
