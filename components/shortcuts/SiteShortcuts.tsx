"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lenisStore, loaderDone } from "@/lib/store";
import ShortcutsOverlay from "./ShortcutsOverlay";

/** `?` anywhere on the portfolio (outside text fields) opens the controls sheet. */
export default function SiteShortcuts() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const wasOpen = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hold the page still while the sheet is up; only resume what this sheet paused.
  useEffect(() => {
    const lenis = lenisStore.get();
    if (open) {
      wasOpen.current = true;
      lenis?.stop();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      if (loaderDone.get()) lenis?.start();
    }
  }, [open]);

  return <ShortcutsOverlay open={open} onClose={close} mode="site" />;
}
