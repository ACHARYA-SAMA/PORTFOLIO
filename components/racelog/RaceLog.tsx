"use client";

import { useRef, useState } from "react";
import RaceTicket from "./RaceTicket";
import Reveal from "@/components/ui/Reveal";
import { RACES, RACE_INTRO, chapterNo } from "@/lib/content";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGsap } from "@/lib/hooks";
import { pad } from "@/lib/format";
import s from "./racelog.module.css";

function Car() {
  return (
    <svg className={s.car} viewBox="0 0 64 24" aria-hidden="true">
      <path d="M2 12c0-2 2-3 5-3h8l4-4h14c3 0 5 2 8 4l12 1c5 0 9 1 9 2s-4 2-9 2l-12 1c-3 2-5 4-8 4H19l-4-4H7c-3 0-5-1-5-3Z" />
      <rect x="10" y="1" width="9" height="5" rx="1.5" />
      <rect x="10" y="18" width="9" height="5" rx="1.5" />
      <rect x="40" y="1" width="9" height="5" rx="1.5" />
      <rect x="40" y="18" width="9" height="5" rx="1.5" />
      <circle cx="30" cy="12" r="2.6" className={s.carHelmet} />
    </svg>
  );
}

export default function RaceLog() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [isStatic, setStatic] = useState(false);

  useGsap(sectionRef, (reduced) => {
    const section = sectionRef.current!;
    const track = trackRef.current!;
    if (reduced) {
      setStatic(true);
      return;
    }

    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tickets = gsap.utils.toArray<HTMLElement>("[data-ticket]", track);

    const travel = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        refreshPriority: 8,
        onUpdate: (self) => {
          const rail = railRef.current;
          const car = carRef.current;
          if (rail && car) {
            const max = rail.offsetWidth - car.offsetWidth;
            car.style.transform = `translate3d(${(self.progress * max).toFixed(1)}px,0,0)`;
          }
          setCurrent(Math.min(tickets.length - 1, Math.round(self.progress * (tickets.length - 1))));
        },
      },
    });

    // Each ticket swings in with a slight rotation and settles as it reaches centre.
    tickets.forEach((ticket, i) => {
      gsap.fromTo(
        ticket,
        { rotation: i % 2 ? 6 : -5, yPercent: 9 },
        {
          rotation: i % 2 ? -0.8 : 0.8,
          yPercent: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ticket,
            containerAnimation: travel,
            start: "left 100%",
            end: "center 58%",
            scrub: true,
          },
        },
      );
    });

    ScrollTrigger.refresh();
  });

  return (
    <section
      ref={sectionRef}
      id="race-log"
      className={s.race}
      data-theme="asphalt"
      data-static={isStatic}
      aria-labelledby="race-title"
    >
      <div className={s.pin}>
        <div className={`label ${s.headRow}`}>
          <span>{chapterNo("race-log")}</span>
          <span className={s.headKicker}>Hackathons &amp; achievements</span>
          <span className={s.counter} aria-hidden="true">
            {pad(current + 1)} / {pad(RACES.length)}
          </span>
        </div>

        <div ref={trackRef} className={s.track}>
          <div className={s.intro}>
            <Reveal as="h2" type="lines" className={`display ${s.title}`} id="race-title">
              <span className={s.titleLine}>Race</span>
              <span className={s.titleLine}>log</span>
            </Reveal>
            <Reveal as="p" type="lines" className={s.introCopy} delay={0.1}>
              {RACE_INTRO}
            </Reveal>

            {/* TODO: attach 1ST PLACE stamp to the right card once we know which hackathon was the win. */}
            <div className={s.stamp} aria-label="First place, once">
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                  <path id="stamp-ring" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0" />
                </defs>
                <circle cx="100" cy="100" r="96" className={s.stampOuter} />
                <circle cx="100" cy="100" r="62" className={s.stampInner} />
                <text className={s.stampRing}>
                  <textPath href="#stamp-ring">ONE WIN · ONE WIN · ONE WIN · ONE WIN · </textPath>
                </text>
              </svg>
              <span className={`display ${s.stampText}`}>
                1st
                <br />
                place
              </span>
            </div>

            <p className={`label ${s.hint}`} aria-hidden="true">
              Keep scrolling <span>→</span>
            </p>
          </div>

          {RACES.map((entry, i) => (
            <RaceTicket key={entry.id} entry={entry} index={i} total={RACES.length} />
          ))}
          <div className={s.trackEnd} aria-hidden="true" />
        </div>

        <div className={s.railWrap} aria-hidden="true">
          <span className="label">Start</span>
          <div ref={railRef} className={s.rail}>
            <div ref={carRef} className={s.carWrap}>
              <Car />
            </div>
          </div>
          <span className="label">Finish</span>
        </div>
      </div>
    </section>
  );
}
