"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import RichText from "@/components/ui/RichText";
import { requestShutter } from "@/components/RouteShutter";
import {
  ABOUT_COPY,
  CHANNELS,
  CONTACT,
  CONTACT_STATUS,
  FLYERS,
  LICENCE_FIELDS,
  OFF_TRACK_FACTS,
  OFF_TRACK_LINE,
  PROJECTS,
  RACES,
  RACE_INTRO,
  RADIO,
  STATS,
  TELEMETRY_INTRO,
} from "@/lib/content";
import { mailtoHref } from "@/lib/contact";
import { sectionHref, workHref, PORTFOLIO } from "@/lib/routes";
import { ZONES, type ZoneId } from "@/lib/zones";
import { command, pushToast, useUI } from "../engine/store";
import s from "./hud.module.css";

/** Deep link into the classic site, through the same shutter as Visit Portfolio. */
function openSection(href: string) {
  window.dispatchEvent(new CustomEvent("aa:world-leave"));
  requestShutter(href, 200);
}

function FullSection({ zone }: { zone: ZoneId }) {
  const section = ZONES.find((z) => z.id === zone)!.section;
  const href = sectionHref(section);
  return (
    <a
      className={`label ${s.full}`}
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openSection(href);
      }}
    >
      Open full section ↗
    </a>
  );
}

function Pit() {
  return (
    <>
      {ABOUT_COPY.map((p, i) => (
        <p key={i} className={s.copy}>
          <RichText text={p} />
        </p>
      ))}
      <dl className={s.fields}>
        {LICENCE_FIELDS.map((f) => (
          <div key={f.key}>
            <dt className="label">{f.key}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function RaceLog() {
  return (
    <>
      <p className={s.copy}>{RACE_INTRO}</p>
      <ol className={s.list}>
        {RACES.map((r, i) => (
          <li key={r.id}>
            <span className={`label ${s.idx}`}>Gate {String(i + 1).padStart(2, "0")}</span>
            <b>{r.name}</b> <span className={`label ${s.tag}`}>{r.kind}</span>
            <span className={s.result}>{r.result}</span>
            {r.detail ? <span className={s.detail}>{r.detail}</span> : null}
          </li>
        ))}
      </ol>
      <p className={`label ${s.hintLine}`}>Drive the oval through all seven gates in order for a clean lap.</p>
    </>
  );
}

function Garage() {
  return (
    <ul className={s.list}>
      {PROJECTS.map((p) => (
        <li key={p.id}>
          <b>{p.title}</b>
          {p.flagship ? <span className={`label ${s.tag}`}>Flagship</span> : null}
          {p.line ? <span className={s.detail}>{p.line}</span> : null}
          <span className={`label ${s.tags}`}>{p.tags.join(" · ")}</span>
          <a
            className={`label ${s.inline}`}
            href={workHref(p.id)}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              openSection(workHref(p.id));
            }}
          >
            Case file ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

function Telemetry() {
  return (
    <>
      <p className={s.copy}>{TELEMETRY_INTRO}</p>
      <dl className={s.fields}>
        {CHANNELS.map((c) => (
          <div key={c.name}>
            <dt className="label">{c.name}</dt>
            <dd>{c.nodes.map((n) => (n.note ? `${n.label} (${n.note})` : n.label)).join(", ")}</dd>
          </div>
        ))}
      </dl>
      <p className={`label ${s.hintLine}`}>Every crate in the field is one of these. Break a whole channel.</p>
    </>
  );
}

function Dojo() {
  const belt = RACES.find((r) => r.variant === "belt");
  const title = STATS.find((x) => x.label === "State-level karate title");
  const dojo = useUI((st) => st.dojo);
  return (
    <>
      {belt ? (
        <p className={s.copy}>
          <b>{belt.name}.</b> {belt.result}
        </p>
      ) : null}
      {title ? (
        <p className={`label ${s.hintLine}`}>
          {title.value} · {title.label}
        </p>
      ) : null}
      <button type="button" className={`label ${s.action}`} onClick={() => command("dojoStart")} disabled={dojo.active}>
        {dojo.active ? "Breaking…" : "Break the boards (30 s)"}
      </button>
      {dojo.best > 0 ? <p className={`label ${s.hintLine}`}>Best: {dojo.best} boards</p> : null}
    </>
  );
}

function Radio() {
  return (
    <>
      {RADIO.map((r) => (
        <div key={r.org} className={s.radio}>
          <span className={`label ${s.idx}`}>{r.channel}</span>
          <b>{r.org}</b> <span className={`label ${s.tag}`}>{r.orgDetail}</span>
          <p className={s.copy}>
            {r.role} {r.text}
          </p>
        </div>
      ))}
      <p className={`label ${s.hintLine}`}>Flyers: {FLYERS.join(" · ")} {/* TODO: add real flyer images */}(placeholders until the real flyers are in)</p>
    </>
  );
}

function OffTrack() {
  return (
    <>
      <p className={s.copy}>{OFF_TRACK_LINE}</p>
      <ul className={s.facts}>
        <li>{OFF_TRACK_FACTS.ride}</li>
        <li>{OFF_TRACK_FACTS.games.join(" · ")}</li>
        <li>{OFF_TRACK_FACTS.anime}</li>
        <li>{OFF_TRACK_FACTS.music}</li>
      </ul>
      <p className={`label ${s.hintLine}`}>Four cabinets, four stunts: the can pyramid, the ramp, the slalom, the speed gate.</p>
    </>
  );
}

function PitExit() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      pushToast({ kind: "info", title: "Email copied", body: CONTACT.email }, 2200);
    } catch {
      window.location.href = mailtoHref();
    }
  };
  return (
    <>
      <p className={s.copy}>{CONTACT_STATUS}</p>
      <div className={s.links}>
        <button type="button" className={`label ${s.action}`} onClick={copy}>
          {copied ? "Copied" : "Copy email"} · {CONTACT.email}
        </button>
        <a className={`label ${s.action}`} href={mailtoHref()}>
          Write an email ↗
        </a>
        <a className={`label ${s.action}`} href={CONTACT.linkedin.href} target="_blank" rel="noopener noreferrer">
          LinkedIn ↗
        </a>
        <a className={`label ${s.action}`} href={CONTACT.github.href} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
        <a
          className={`label ${s.action}`}
          href={`${PORTFOLIO}/cv`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            openSection(`${PORTFOLIO}/cv`);
          }}
        >
          CV ↗
        </a>
      </div>
    </>
  );
}

const CONTENT: Record<ZoneId, () => ReactNode> = {
  pit: Pit,
  "race-log": RaceLog,
  garage: Garage,
  telemetry: Telemetry,
  dojo: Dojo,
  radio: Radio,
  "off-track": OffTrack,
  "pit-exit": PitExit,
};

/** The content plate that opens on a pad. E, Esc or the close button dismiss it. */
export default function ZonePanel() {
  const panel = useUI((st) => st.panel);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (panel) closeRef.current?.focus({ preventScroll: true });
  }, [panel]);

  if (!panel) return null;
  const zone = ZONES.find((z) => z.id === panel)!;
  const Body = CONTENT[panel];
  const no = String(ZONES.findIndex((z) => z.id === panel) + 1).padStart(2, "0");

  return (
    <section className={s.panel} role="dialog" aria-modal="false" aria-labelledby="zone-title" data-lenis-prevent="">
      <span className={`${s.rivet} ${s.rtl}`} aria-hidden="true" />
      <span className={`${s.rivet} ${s.rtr}`} aria-hidden="true" />
      <header className={s.panelHead}>
        <span className={`label ${s.panelNo}`}>Zone {no}</span>
        <h2 id="zone-title" className={`display ${s.panelTitle}`}>
          {zone.label}
        </h2>
        <button ref={closeRef} type="button" className={`label ${s.close}`} onClick={() => command("closePanel")} aria-keyshortcuts="E Escape">
          Close <kbd className={s.kbd}>E</kbd>
        </button>
      </header>
      <div className={s.panelBody}>
        <Body />
      </div>
      <footer className={s.panelFoot}>
        <FullSection zone={panel} />
      </footer>
    </section>
  );
}
