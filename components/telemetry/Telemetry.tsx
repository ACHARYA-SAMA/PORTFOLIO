"use client";

import { useRef } from "react";
import TelemetryChannel from "./TelemetryChannel";
import SectionHead from "@/components/ui/SectionHead";
import Reveal from "@/components/ui/Reveal";
import { CHANNELS, TELEMETRY_INTRO, chapterNo } from "@/lib/content";
import { gsap } from "@/lib/gsap";
import { observeVisibility, useGsap } from "@/lib/hooks";
import { pad } from "@/lib/format";
import s from "./telemetry.module.css";

export default function Telemetry() {
  const dashRef = useRef<HTMLDivElement>(null);

  // Channels power on one after another; the carrier only runs while on screen.
  useGsap(dashRef, (reduced) => {
    const dash = dashRef.current!;
    const stopObserving = observeVisibility(dash, (v) => dash.toggleAttribute("data-live", v));
    if (!reduced) {
      const channels = dash.querySelectorAll("[data-channel]");
      gsap.from(channels, {
        clipPath: "inset(0 100% 0 0)",
        duration: 1.3,
        ease: "expo.inOut",
        stagger: 0.12,
        scrollTrigger: { trigger: dash, start: "top 78%", once: true },
      });
    }
    return stopObserving;
  });

  return (
    <section id="telemetry" className={s.tele} data-theme="asphalt" aria-labelledby="tele-title">
      <div className={s.wrap}>
        <SectionHead
          index={chapterNo("telemetry")}
          kicker="Skills"
          meta={`${pad(CHANNELS.length)} channels`}
          title={["Telemetry"]}
          titleClassName={s.title}
          titleId="tele-title"
        />

        <Reveal as="p" type="lines" className={s.intro}>
          {TELEMETRY_INTRO}
        </Reveal>

        <div ref={dashRef} className={s.dash}>
          <div className={`label ${s.dashBar}`} aria-hidden="true">
            <span>
              <i className={s.rec} /> Live
            </span>
            <span>Channel</span>
            <span className={s.dashSignal}>Signal</span>
            <span>Nodes</span>
          </div>
          {CHANNELS.map((c, i) => (
            <TelemetryChannel key={c.name} index={i} name={c.name} nodes={c.nodes} />
          ))}
        </div>
      </div>
    </section>
  );
}
