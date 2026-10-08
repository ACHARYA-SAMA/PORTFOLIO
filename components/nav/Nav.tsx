"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NavLink from "./NavLink";
import TransitionLink from "@/components/TransitionLink";
import LiveClock from "./LiveClock";
import SoundToggle from "./SoundToggle";
import { PROJECTS } from "@/lib/content";
import { ScrollTrigger } from "@/lib/gsap";
import { pad } from "@/lib/format";
import { lenisStore, loaderDone, scrollToTarget, transition, useStore } from "@/lib/store";
import s from "./nav.module.css";
import { PORTFOLIO, sectionHref } from "@/lib/routes";

// "Garage" carries the project count, derived from the data rather than typed in.
const LINKS = [
  { href: "#radio", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#race-log", label: "Race Log" },
  { href: "#garage", label: "Garage", sup: pad(PROJECTS.length) },
];

type Tone = "red" | "paper" | "dark";
const toneOf = (theme: string | null): Tone =>
  theme === "red" ? "red" : theme === "paper" ? "paper" : "dark";

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const [tone, setTone] = useState<Tone>("dark");
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ready = useStore(loaderDone, false);
  const home = usePathname() === PORTFOLIO;

  useEffect(() => {
    const triggers: ScrollTrigger[] = [];

    // Colour follows whichever section sits under the bar.
    document.querySelectorAll<HTMLElement>("main [data-theme]").forEach((section) => {
      if (section.closest("[data-theme]") !== section) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: "top 34px",
          end: "bottom 34px",
          onToggle: (self) => self.isActive && setTone(toneOf(section.dataset.theme ?? null)),
        }),
      );
    });

    LINKS.forEach(({ href }) => {
      const target = document.querySelector(href);
      if (!target) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: target,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => setActive((cur) => (self.isActive ? href : cur === href ? null : cur)),
        }),
      );
    });

    // Hide on the way down, return on the way up, always visible near the top.
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 140) setHidden(false);
      else if (y > lastY + 2) setHidden(true);
      else if (y < lastY - 2) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      triggers.forEach((t) => t.kill());
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const lenis = lenisStore.get();
    if (open) lenis?.stop();
    else if (loaderDone.get()) lenis?.start();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (href: string, label: string) => {
    setOpen(false);
    if (home) requestAnimationFrame(() => scrollToTarget(href));
    else transition.set({ label, phase: "cover", href: `${PORTFOLIO}${href}` });
  };

  return (
    <>
      <header
        ref={navRef}
        className={s.nav}
        data-tone={open ? "dark" : tone}
        data-hidden={hidden && !open}
        data-intro={ready ? "done" : "pending"}
      >
        {home ? (
          <a href="#top" className={s.logo} data-cursor="HELLO" aria-label="Arman Acharya, back to top">
            arman<sup aria-hidden="true">®</sup>
          </a>
        ) : (
          <TransitionLink href={PORTFOLIO} label="Arman" className={s.logo} data-cursor="HOME" aria-label="Arman Acharya, home">
            arman<sup aria-hidden="true">®</sup>
          </TransitionLink>
        )}

        <nav className={s.links} aria-label="Sections">
          {LINKS.map((l) => (
            <NavLink key={l.href} {...l} home={home} active={active === l.href} />
          ))}
        </nav>

        <div className={s.right}>
          <LiveClock className={s.clock} colonClassName={s.colon} tzClassName={s.tz} />
          <SoundToggle className={s.sound} barsClassName={s.bars} />
          {home ? (
            <a href="#contact" className={`label ${s.pill}`} data-cursor="HELLO">
              <span className={s.live} aria-hidden="true" />
              <span>Let’s talk</span>
            </a>
          ) : (
            <TransitionLink href={sectionHref("contact")} label="Pit exit" className={`label ${s.pill}`} data-cursor="HELLO">
              <span className={s.live} aria-hidden="true" />
              <span>Let’s talk</span>
            </TransitionLink>
          )}
          <button
            type="button"
            className={s.menuBtn}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <i />
            <i />
          </button>
        </div>
      </header>

      <div id="mobile-menu" className={s.overlay} data-open={open} data-theme="ink" aria-hidden={!open} inert={!open}>
        <nav className={s.bigLinks} aria-label="Sections">
          {[...LINKS, { href: "#contact", label: "Contact" }].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`display ${s.bigLink}`}
              onClick={(e) => {
                e.preventDefault();
                go(l.href, l.label);
              }}
            >
              <span>{l.label}</span>
            </a>
          ))}
        </nav>
        <div className={`label ${s.overlayFoot}`}>
          <span>Hyderabad, IN</span>
          <span>B.Tech CSE (DS)</span>
        </div>
      </div>
    </>
  );
}
