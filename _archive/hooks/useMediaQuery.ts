"use client";
import { useState, useEffect } from "react";

/**
 * Reactive media query hook. Returns true when the query matches.
 * Reads once on mount and updates on resize/orientation change.
 *
 * @example
 *   const isMobile = useMediaQuery("(max-width: 767px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Shorthand: true when viewport < 768px */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
