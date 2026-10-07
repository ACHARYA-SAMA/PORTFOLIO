"use client";

import { useRef } from "react";
import DriverCard from "./DriverCard";
import StatDials from "@/components/stats/StatDials";
import Reveal from "@/components/ui/Reveal";
import RichText from "@/components/ui/RichText";
import { ABOUT_COPY, chapterNo } from "@/lib/content";
import { gsap, SplitText } from "@/lib/gsap";
import { useGsap } from "@/lib/hooks";
import s from "./about.module.css";

export default function About() {
  const copyRef = useRef<HTMLDivElement>(null);

  // Word-by-word opacity, scrubbed by scroll.
  useGsap(copyRef, (reduced) => {
    const el = copyRef.current;
    if (!el || reduced) return;
    const split = SplitText.create(el.querySelectorAll("p"), { type: "words" });
    gsap.fromTo(
      split.words,
      { opacity: 0.15 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 55%", scrub: 0.6 },
      },
    );
    return () => split.revert();
  });

  return (
    <section id="about" className={s.about} data-theme="paper" aria-labelledby="about-title">
      <div className={s.wrap}>
        <div className={`label ${s.headRow}`}>
          <span>{chapterNo("about")}</span>
          <span className={s.headKicker}>Driver profile</span>
          <span className={s.headMeta}>About</span>
        </div>

        <h2 id="about-title" className={`display ${s.name}`}>
          <Reveal as="span" type="chars" className={s.nameLine} stagger={0.03}>
            Arman
          </Reveal>
          <span className={s.nameLine}>
            <Reveal as="span" type="chars" stagger={0.03} delay={0.12}>
              Acharya
            </Reveal>
            <span className={s.aka}>(also Raj)</span>
          </span>
        </h2>

        <div className={s.grid}>
          <div ref={copyRef} className={s.copy}>
            {ABOUT_COPY.map((p, i) => (
              <p key={i}>
                <RichText text={p} />
              </p>
            ))}
          </div>
          <aside className={s.cardCol} aria-label="Profile">
            <DriverCard />
          </aside>
        </div>

        <StatDials />
      </div>
    </section>
  );
}
