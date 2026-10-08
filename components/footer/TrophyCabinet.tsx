"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS, BOLT_COUNT, KEYS, hasPlayed, readList, readNumbers, readStats, type Stats } from "@/lib/progress";
import { ZONES } from "@/lib/zones";
import BackToWorldLink from "./BackToWorldLink";
import s from "./trophies.module.css";

type Snapshot = { stats: Stats; unlocked: string[]; bolts: number; visited: number };

/** What the world remembers, read from the same localStorage keys the game writes. */
export default function TrophyCabinet() {
  // null until mounted: storage is per-browser, so the server renders the frame only.
  const [snap, setSnap] = useState<Snapshot | null | "empty">(null);

  useEffect(() => {
    const read = () =>
      setSnap(
        hasPlayed()
          ? { stats: readStats(), unlocked: readList(KEYS.achievements), bolts: readNumbers(KEYS.bolts).length, visited: readList(KEYS.visited).length }
          : "empty",
      );
    read();
    // Another tab playing the world updates this one.
    const onStorage = (e: StorageEvent) => e.key?.startsWith("arman:v1:") && read();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const rows =
    snap && snap !== "empty"
      ? [
          { k: "Boards broken", v: snap.stats.boards },
          { k: "Objects destroyed", v: snap.stats.destroyed },
          { k: "Best demolition", v: snap.stats.bestRush },
          { k: "Areas visited", v: `${snap.visited} / ${ZONES.length}` },
          { k: "Bolts", v: `${snap.bolts} / ${BOLT_COUNT}` },
          { k: "Achievements", v: `${snap.unlocked.length} / ${ACHIEVEMENTS.length}` },
        ]
      : [];
  const earned = snap && snap !== "empty" ? ACHIEVEMENTS.filter((a) => snap.unlocked.includes(a.id)) : [];

  return (
    <section className={s.cabinet} aria-labelledby="trophy-title">
      <div className={s.head}>
        <h2 id="trophy-title" className={`label ${s.title}`}>
          Trophy cabinet <span className={s.sub}>from the world</span>
        </h2>
        <BackToWorldLink />
      </div>

      {snap === "empty" ? (
        <p className={`label ${s.empty}`}>Not played yet</p>
      ) : snap ? (
        <>
          <dl className={s.stats}>
            {rows.map((r) => (
              <div key={r.k} className={s.stat}>
                <dt className="label">{r.k}</dt>
                <dd className={`display ${s.value}`}>{r.v}</dd>
              </div>
            ))}
          </dl>
          {earned.length ? (
            <ul className={s.stamps} aria-label="Achievements earned">
              {earned.map((a) => (
                <li key={a.id} className={`label ${s.stamp}`} title={a.detail}>
                  {a.label}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className={`label ${s.empty}`} aria-hidden="true">
          &nbsp;
        </p>
      )}
    </section>
  );
}
