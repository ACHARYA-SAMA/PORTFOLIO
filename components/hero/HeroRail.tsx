"use client";

import { HERO_RAIL, SCENES } from "@/lib/content";
import s from "./hero.module.css";

type Props = {
  scene: number;
  cycleKey: number;
  running: boolean;
  paused: boolean;
  cycleMs: number;
  onJump: (index: number) => void;
  onTogglePause: () => void;
};

export default function HeroRail({ scene, cycleKey, running, paused, cycleMs, onJump, onTogglePause }: Props) {
  return (
    <div className={s.rail} data-rail="">
      <p className={`label ${s.railLeft}`}>{HERO_RAIL}</p>

      <div className={s.railCenter}>
        <ol className={s.segments} aria-label="Scenes">
          {SCENES.map((sc, i) => (
            <li key={i}>
              <button
                type="button"
                className={`${s.seg} ${i < scene ? s.segPast : ""} ${i === scene ? s.segActive : ""}`}
                aria-label={`Scene ${i + 1} of ${SCENES.length}${sc.drums === "DATE" ? ": today's date" : `: ${sc.drums}`}`}
                aria-current={i === scene ? "step" : undefined}
                onClick={() => onJump(i)}
              >
                <span
                  key={i === scene ? `on-${cycleKey}` : "off"}
                  className={s.segFill}
                  style={
                    i === scene
                      ? { animationDuration: `${cycleMs}ms`, animationPlayState: running ? "running" : "paused" }
                      : undefined
                  }
                />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className={`label ${s.pause}`} onClick={onTogglePause} aria-pressed={paused}>
          {paused ? "Play" : "Pause"}
        </button>
      </div>

      <a href="#marquee" className={`label ${s.railRight}`}>
        Scroll to explore
        <span className={s.scrollLine} aria-hidden="true">
          <span />
        </span>
      </a>
    </div>
  );
}
