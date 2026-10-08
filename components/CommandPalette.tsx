"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CHAPTERS, CONTACT, chapterNo } from "@/lib/content";
import { lenisStore, scrollToTarget, soundOn, toast, transition } from "@/lib/store";
import { setSound } from "@/lib/sound";
import { PORTFOLIO, sectionHref } from "@/lib/routes";
import { mailtoHref } from "@/lib/contact";

type Command = { id: string; group: string; label: string; hint: string; run: () => void };

/** Ctrl/Cmd + K. Jump to any chapter or open email, CV, GitHub. Styled like the machine plate. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const commands = useMemo<Command[]>(() => {
    const jump = (id: string, label: string) => () => {
      if (pathname === PORTFOLIO) scrollToTarget(id === "unmask" ? 0 : `#${id}`);
      else transition.set({ label, phase: "cover", href: sectionHref(id) });
    };
    return [
      ...CHAPTERS.map((c) => ({
        id: `go-${c.id}`,
        group: "Jump",
        label: c.label,
        hint: chapterNo(c.id),
        run: jump(c.id, c.label),
      })),
      {
        id: "copy-email",
        group: "Contact",
        label: "Copy email",
        hint: "⧉",
        run: () => {
          void navigator.clipboard?.writeText(CONTACT.email).then(() => toast("Copied"));
        },
      },
      { id: "mail", group: "Contact", label: "Write an email", hint: "↗", run: () => (window.location.href = mailtoHref()) },
      { id: "cv", group: "Contact", label: "Open CV", hint: "A4", run: () => window.open(CONTACT.cv, "_blank", "noopener,noreferrer") },
      { id: "gh", group: "Contact", label: "Open GitHub", hint: "↗", run: () => window.open(CONTACT.github.href, "_blank", "noopener,noreferrer") },
      { id: "li", group: "Contact", label: "Open LinkedIn", hint: "↗", run: () => window.open(CONTACT.linkedin.href, "_blank", "noopener,noreferrer") },
      // BackToWorldLink's destination: ?world=1 gets past "skip intro next time".
      { id: "world", group: "Site", label: "Back to world", hint: "↗", run: () => window.location.assign("/?world=1") },
      {
        id: "sound",
        group: "Site",
        label: "Toggle sound",
        hint: "♪",
        run: () => {
          const next = !soundOn.get();
          setSound(next);
          toast(next ? "Sound on" : "Sound off");
        },
      },
    ];
  }, [pathname]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const lenis = lenisStore.get();
    if (!open) {
      lenis?.start();
      return;
    }
    lenis?.stop();
    setQuery("");
    setActive(0);
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      lenis?.start();
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    requestAnimationFrame(c.run);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === "Tab") e.preventDefault();
  };

  return (
    <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKeyDown}>
      <button type="button" className="cmdk__scrim" aria-label="Close" onClick={() => setOpen(false)} tabIndex={-1} />
      <div className="cmdk__plate" data-theme="ink">
        <div className="cmdk__head">
          <i className="cmdk__rivet" />
          <span className="cmdk__led">CMD / K</span>
          <input
            ref={inputRef}
            autoFocus
            className="cmdk__input"
            placeholder="Jump to… or type email, cv, github"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
            aria-autocomplete="list"
            spellCheck={false}
          />
          <kbd className="cmdk__esc label">Esc</kbd>
          <i className="cmdk__rivet" />
        </div>
        <ul id="cmdk-list" className="cmdk__list" role="listbox">
          {results.length === 0 && <li className="cmdk__empty label">No match</li>}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`cmdk-${c.id}`}
              role="option"
              aria-selected={i === active}
              className="cmdk__item"
              onPointerMove={() => setActive(i)}
              onClick={() => run(c)}
            >
              <span className="cmdk__group label">{c.group}</span>
              <span className="cmdk__label">{c.label}</span>
              <span className="cmdk__hint label">{c.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
