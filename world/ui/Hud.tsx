"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OdometerDrums from "@/components/OdometerDrums";
import RichText from "@/components/ui/RichText";
import ShortcutsOverlay from "@/components/shortcuts/ShortcutsOverlay";
import { SCENES } from "@/lib/content";
import { KEYS, readFlag, writeFlag } from "@/lib/progress";
import { setSound } from "@/lib/sound";
import { ZONES } from "@/lib/zones";
import { CAR_COLORS, TIERS, type Tier } from "../engine/config";
import { getGame } from "../engine/instance";
import { command, telemetry, useUI, ui } from "../engine/store";
import { sanitizePlate } from "../engine/game";
import HudDrums from "./HudDrums";
import Minimap from "./Minimap";
import ZonePanel from "./ZonePanel";
import s from "./hud.module.css";

const readSpeed = () => String(Math.min(999, Math.round(Math.abs(telemetry.speed))));
const readScore = () => String(Math.min(999999, useUI.getState().score));

/* ── Title ──────────────────────────────────────────────── */

function TitleScreen() {
  const device = useUI((st) => st.device);
  const sound = useUI((st) => st.sound);
  const [skip, setSkip] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSkip(readFlag(KEYS.skipIntro));
  }, []);

  const touch = device === "touch";
  return (
    <div className={s.title}>
      <div className={s.titleCenter}>
        <OdometerDrums count={5} initial="ARMAN" sound className={s.titleDrums} flick />
        <p className={s.titleCaption}>
          <RichText text={SCENES[0].caption} emClassName={s.em} />
        </p>
        <button ref={startRef} type="button" className={`label ${s.start}`} onClick={() => command("start")}>
          {touch ? "Tap to play" : "Press start"}
          <span className={s.startKey} aria-hidden="true">
            {touch ? "" : device === "gamepad" ? "Start" : "Enter"}
          </span>
        </button>
        <button type="button" className={`label ${s.explore}`} onClick={() => ui.set({ zoneMenuOpen: true })}>
          Explore without driving
        </button>
      </div>
      <div className={s.titleBottom}>
        <label className={`label ${s.toggle}`}>
          <input
            type="checkbox"
            checked={skip}
            onChange={(e) => {
              setSkip(e.target.checked);
              writeFlag(KEYS.skipIntro, e.target.checked);
            }}
          />
          <span className={s.switch} aria-hidden="true" />
          Skip intro next time
        </label>
        <label className={`label ${s.toggle}`}>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              setSound(e.target.checked);
              getGame()?.setSound(e.target.checked);
            }}
          />
          <span className={s.switch} aria-hidden="true" />
          Sound
        </label>
        <button type="button" className={`label ${s.linkBtn}`} onClick={() => ui.set({ customizeOpen: true })}>
          Customise car
        </button>
      </div>
    </div>
  );
}

/* ── In-play HUD ────────────────────────────────────────── */

function Boost() {
  const bar = useRef<HTMLSpanElement>(null);
  const combo = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (bar.current) {
        bar.current.style.transform = `scaleX(${telemetry.boost.toFixed(3)})`;
        bar.current.dataset.on = String(telemetry.boosting);
      }
      if (combo.current) combo.current.style.transform = `scaleX(${(telemetry.comboTime / 2.5).toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const c = useUI((st) => st.combo);
  return (
    <>
      <div className={s.meter}>
        <span className={`label ${s.meterKey}`}>Boost</span>
        <span className={s.meterTrack}>
          <span ref={bar} className={s.meterFill} />
        </span>
      </div>
      <div className={s.combo} data-on={c > 1}>
        <span className={`display ${s.comboMul}`}>×{Math.max(1, c)}</span>
        <span className={s.meterTrack}>
          <span ref={combo} className={`${s.meterFill} ${s.comboFill}`} />
        </span>
      </div>
    </>
  );
}

function TopLeft() {
  const rush = useUI((st) => st.rush);
  const dojo = useUI((st) => st.dojo);
  return (
    <div className={s.topLeft}>
      <div className={s.gauge}>
        <HudDrums count={3} read={readSpeed} className={s.speedDrums} />
        <span className={`label ${s.unit}`}>km/h</span>
      </div>
      <div className={s.gauge}>
        <HudDrums count={6} read={readScore} className={s.scoreDrums} />
        <span className={`label ${s.unit}`}>score</span>
      </div>
      <Boost />
      {rush.active ? (
        <div className={`label ${s.timer}`}>
          Demolition rush · {Math.ceil(rush.timeLeft)} s · {rush.score} pts
        </div>
      ) : null}
      {dojo.active ? (
        <div className={`label ${s.timer}`}>
          Break the boards · {Math.ceil(dojo.timeLeft)} s · {dojo.boards} boards
        </div>
      ) : null}
    </div>
  );
}

function TopRight() {
  const sound = useUI((st) => st.sound);
  const tier = useUI((st) => st.tier);
  const manual = useUI((st) => st.tierManual);
  return (
    <div className={s.topRight}>
      <button
        type="button"
        className={`label ${s.chip}`}
        aria-pressed={sound}
        onClick={() => {
          setSound(!sound);
          getGame()?.setSound(!sound);
        }}
        aria-keyshortcuts="M"
      >
        {sound ? "Sound on" : "Sound off"}
      </button>
      <button type="button" className={`label ${s.chip}`} onClick={() => command("help")} aria-keyshortcuts="?" aria-label="Controls">
        ?
      </button>
      <label className={`label ${s.chip} ${s.select}`}>
        <span className="sr-only">Quality</span>
        <select
          value={manual ? tier : "auto"}
          onChange={(e) => getGame()?.setQuality(e.target.value as Tier | "auto")}
          aria-label="Quality"
        >
          <option value="auto">Auto ({tier})</option>
          {(Object.keys(TIERS) as Tier[]).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Prompts() {
  const prompt = useUI((st) => st.prompt);
  const device = useUI((st) => st.device);
  if (device === "touch") return prompt ? <div className={`label ${s.prompts}`}>{prompt}</div> : null;
  return (
    <div className={`label ${s.prompts}`} aria-live="polite">
      {prompt ? <span className={s.promptMain}>{prompt}</span> : null}
      <span>
        <kbd className={s.kbd}>B</kbd> Rebuild
      </span>
      <span>
        <kbd className={s.kbd}>R</kbd> Respawn
      </span>
    </div>
  );
}

function Hint() {
  const hint = useUI((st) => st.hint);
  const device = useUI((st) => st.device);
  if (!hint) return null;
  const items =
    device === "touch"
      ? ["Left stick: drive", "BOOST", "DRIFT", "E: open"]
      : device === "gamepad"
        ? ["Left stick: steer", "RT / LT: go, brake", "South: boost", "East: drift"]
        : ["W A S D: drive", "Space: drift", "Shift: boost", "? : all controls"];
  return (
    <div className={`label ${s.hint}`} role="status">
      {items.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
}

function Banner() {
  const banner = useUI((st) => st.banner);
  if (!banner) return null;
  return (
    <div key={banner.id} className={s.banner} role="status">
      <span className={`display ${s.bannerText}`}>
        <span>{banner.text}</span>
      </span>
    </div>
  );
}

function Toasts() {
  const toasts = useUI((st) => st.toasts);
  return (
    <div className={s.toasts} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={s.toast} data-kind={t.kind}>
          {t.meta ? <span className={`label ${s.toastMeta}`}>{t.meta}</span> : null}
          <b className={s.toastTitle}>{t.title}</b>
          {t.body ? <span className={s.toastBody}>{t.body}</span> : null}
        </div>
      ))}
    </div>
  );
}

/* ── Menus ──────────────────────────────────────────────── */

function ZoneMenu() {
  const open = useUI((st) => st.zoneMenuOpen);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className={s.scrim} onClick={() => ui.set({ zoneMenuOpen: false })}>
      <div className={s.menu} role="dialog" aria-modal="true" aria-labelledby="zm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="zm-title" className={`display ${s.menuTitle}`}>
          Explore
        </h2>
        <p className={s.menuLine}>Jump straight to a zone. No driving needed.</p>
        <ul className={s.zoneList}>
          {ZONES.map((z, i) => (
            <li key={z.id}>
              <button ref={i === 0 ? first : undefined} type="button" className={s.zoneBtn} onClick={() => getGame()?.teleport(z.id)}>
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                {z.label}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={`label ${s.linkBtn}`} onClick={() => ui.set({ zoneMenuOpen: false })}>
          Close
        </button>
      </div>
    </div>
  );
}

function Customize() {
  const open = useUI((st) => st.customizeOpen);
  const [plate, setPlate] = useState("ARMAN");
  const [color, setColor] = useState<string>(CAR_COLORS[0].hex);
  useEffect(() => {
    if (!open) return;
    try {
      const raw = JSON.parse(localStorage.getItem(KEYS.car) ?? "{}") as { color?: string; plate?: string };
      if (raw.plate) setPlate(raw.plate);
      if (raw.color) setColor(raw.color);
    } catch {
      /* defaults */
    }
  }, [open]);
  if (!open) return null;
  const apply = (c: string, p: string) => getGame()?.setCar(c, p);
  return (
    <div className={s.scrim} onClick={() => ui.set({ customizeOpen: false })}>
      <div className={s.menu} role="dialog" aria-modal="true" aria-labelledby="cz-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="cz-title" className={`display ${s.menuTitle}`}>
          Customise
        </h2>
        <fieldset className={s.swatches}>
          <legend className="label">Body colour</legend>
          {CAR_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={s.swatch}
              style={{ background: c.hex }}
              aria-pressed={color === c.hex}
              aria-label={c.label}
              title={c.label}
              onClick={() => {
                setColor(c.hex);
                apply(c.hex, plate);
              }}
            />
          ))}
        </fieldset>
        <label className={`label ${s.plateField}`}>
          Plate (drum letters, 7 max)
          <input
            value={plate}
            maxLength={7}
            onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 7))}
            onBlur={() => {
              const clean = sanitizePlate(plate);
              setPlate(clean);
              apply(color, clean);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </label>
        <button type="button" className={`label ${s.action}`} onClick={() => ui.set({ customizeOpen: false })}>
          Done
        </button>
      </div>
    </div>
  );
}

function PauseMenu() {
  const paused = useUI((st) => st.paused);
  const time = useUI((st) => st.time);
  const sound = useUI((st) => st.sound);
  const tier = useUI((st) => st.tier);
  const manual = useUI((st) => st.tierManual);
  const first = useRef<HTMLButtonElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [replays, setReplays] = useState(true);
  useEffect(() => {
    if (paused) {
      first.current?.focus();
      setReplays(getGame()?.prefs.replays ?? true);
    } else setConfirm(false);
  }, [paused]);
  if (!paused) return null;
  return (
    <div className={s.scrim}>
      <div className={s.menu} role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <h2 id="pm-title" className={`display ${s.menuTitle}`}>
          Paused
        </h2>
        <div className={s.menuCol}>
          <button ref={first} type="button" className={`label ${s.action}`} onClick={() => command("resume")}>
            Resume
          </button>
          <button type="button" className={`label ${s.action}`} onClick={() => ui.set({ zoneMenuOpen: true })}>
            Explore zones
          </button>
          <button type="button" className={`label ${s.action}`} onClick={() => ui.set({ customizeOpen: true })}>
            Customise car
          </button>
          <button type="button" className={`label ${s.action}`} onClick={() => command("time")}>
            Time of day: {time}
          </button>
          <button type="button" className={`label ${s.action}`} onClick={() => command("mute")}>
            Sound: {sound ? "on" : "off"}
          </button>
          <label className={`label ${s.action} ${s.select}`}>
            Quality:{" "}
            <select value={manual ? tier : "auto"} onChange={(e) => getGame()?.setQuality(e.target.value as Tier | "auto")}>
              <option value="auto">Auto ({tier})</option>
              {(Object.keys(TIERS) as Tier[]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`label ${s.action}`}
            aria-pressed={replays}
            onClick={() => {
              const g = getGame();
              if (!g) return;
              g.prefs.replays = !g.prefs.replays;
              setReplays(g.prefs.replays);
              try {
                localStorage.setItem(KEYS.prefs, JSON.stringify(g.prefs));
              } catch {
                /* ignore */
              }
            }}
          >
            Slow-motion replays: {replays ? "on" : "off"}
          </button>
          {confirm ? (
            <button
              type="button"
              className={`label ${s.action} ${s.danger}`}
              onClick={() => {
                command("resetProgress");
                setConfirm(false);
              }}
            >
              Really reset progress?
            </button>
          ) : (
            <button type="button" className={`label ${s.action}`} onClick={() => setConfirm(true)}>
              Reset progress
            </button>
          )}
          <button type="button" className={`label ${s.action}`} onClick={() => command("portfolio")}>
            Visit portfolio →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Touch ──────────────────────────────────────────────── */

/** Keep the finger on its control even when it slides off; harmless if the pointer is already gone. */
function capture(e: React.PointerEvent) {
  try {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    /* pointer already released */
  }
}

function TouchControls() {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const id = useRef<number | null>(null);

  const move = useCallback((e: React.PointerEvent) => {
    const el = base.current;
    const g = getGame();
    if (!el || !g) return;
    const b = el.getBoundingClientRect();
    const r = b.width / 2;
    let x = (e.clientX - (b.left + r)) / r;
    let y = (e.clientY - (b.top + r)) / r;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    g.input.touch.x = x;
    g.input.touch.y = y;
    g.input.touch.active = true;
    if (knob.current) knob.current.style.transform = `translate(${(x * r * 0.6).toFixed(1)}px, ${(y * r * 0.6).toFixed(1)}px)`;
  }, []);

  const end = useCallback(() => {
    const g = getGame();
    id.current = null;
    if (g) {
      g.input.touch.active = false;
      g.input.touch.x = 0;
      g.input.touch.y = 0;
    }
    if (knob.current) knob.current.style.transform = "";
  }, []);

  const hold = (key: "boost" | "drift") => ({
    onPointerDown: (e: React.PointerEvent) => {
      capture(e);
      const g = getGame();
      if (g) g.input.touch[key] = true;
      g?.haptic(12);
    },
    onPointerUp: () => {
      const g = getGame();
      if (g) g.input.touch[key] = false;
    },
    onPointerCancel: () => {
      const g = getGame();
      if (g) g.input.touch[key] = false;
    },
  });

  return (
    <div className={s.touch}>
      <div
        ref={base}
        className={s.stick}
        onPointerDown={(e) => {
          id.current = e.pointerId;
          capture(e);
          move(e);
        }}
        onPointerMove={(e) => id.current === e.pointerId && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
        role="presentation"
      >
        <span ref={knob} className={s.knob} />
      </div>
      <div className={s.buttons}>
        <button type="button" className={`label ${s.tbtn}`} onClick={() => command("interact")}>
          E
        </button>
        <button type="button" className={`label ${s.tbtn} ${s.tbtnBig}`} {...hold("drift")}>
          Drift
        </button>
        <button type="button" className={`label ${s.tbtn} ${s.tbtnBig} ${s.tbtnBoost}`} {...hold("boost")}>
          Boost
        </button>
        <button type="button" className={`label ${s.tbtn}`} onClick={() => command("pause")}>
          II
        </button>
      </div>
    </div>
  );
}

function RotateHint() {
  const device = useUI((st) => st.device);
  const phase = useUI((st) => st.phase);
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const up = () => setPortrait(mq.matches);
    up();
    mq.addEventListener("change", up);
    return () => mq.removeEventListener("change", up);
  }, []);
  if (device !== "touch" || !portrait || phase !== "play") return null;
  return <div className={`label ${s.rotate}`}>Rotate for the best experience</div>;
}

function PhotoBar() {
  return (
    <div className={`label ${s.photo}`}>
      <span>Photo mode · drag to orbit · scroll to zoom</span>
      <button type="button" className={`label ${s.action}`} onClick={() => getGame()?.requestPhoto()}>
        Save PNG
      </button>
      <button type="button" className={`label ${s.linkBtn}`} onClick={() => command("photo")}>
        Exit (K)
      </button>
    </div>
  );
}

function Debug() {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!ref.current) return;
      const t = telemetry;
      ref.current.textContent = [
        `fps ${t.fps.toFixed(0)}  frame ${t.frameMs.toFixed(1)} ms  physics ${t.physicsMs.toFixed(2)} ms`,
        `draw calls ${t.drawCalls}  triangles ${t.triangles}`,
        `bodies ${t.bodies}  chunk bodies ${t.activeBodies}  debris ${t.debris}  particles ${t.particles}`,
        `pool ${t.pool}`,
        `memory ${t.memory}`,
      ].join("\n");
    }, 250);
    return () => clearInterval(id);
  }, []);
  return <pre ref={ref} className={s.debug} aria-hidden="true" />;
}

/* ── Root ───────────────────────────────────────────────── */

export default function Hud() {
  const phase = useUI((st) => st.phase);
  const photo = useUI((st) => st.photo);
  const help = useUI((st) => st.helpOpen);
  const device = useUI((st) => st.device);
  const debug = useUI((st) => st.debug);
  const playing = phase === "intro" || phase === "play";
  const closeHelp = useCallback(() => ui.set({ helpOpen: false }), []);

  return (
    <div className={s.hud} data-phase={phase} data-device={device}>
      {phase === "title" ? <TitleScreen /> : null}
      {playing && !photo ? (
        <div className={s.play}>
          <TopLeft />
          <TopRight />
          <Minimap />
          <Prompts />
          <Hint />
          {device === "touch" && phase === "play" ? <TouchControls /> : null}
        </div>
      ) : null}
      {phase === "title" ? <TopRight /> : null}
      {photo ? <PhotoBar /> : null}
      <Banner />
      <Toasts />
      <ZonePanel />
      <PauseMenu />
      <ZoneMenu />
      <Customize />
      <ShortcutsOverlay open={help} onClose={closeHelp} mode="world" />
      <RotateHint />
      {debug ? <Debug /> : null}
      {phase === "leaving" ? <div className={s.dim} /> : null}
    </div>
  );
}
