"use client";

import { useSyncExternalStore } from "react";
import type Lenis from "lenis";

type Listener = () => void;

export type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: Listener) => () => void;
};

function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** True once the loader has split open (or was skipped). */
export const loaderDone = createStore(false);
export const soundOn = createStore(false);
export const lenisStore = createStore<Lenis | null>(null);

export function useStore<T>(store: Store<T>, serverValue: T) {
  return useSyncExternalStore(store.subscribe, store.get, () => serverValue);
}

/** Resolves once the loader is out of the way. */
export function whenLoaderDone() {
  return new Promise<void>((resolve) => {
    if (loaderDone.get()) return resolve();
    const off = loaderDone.subscribe(() => {
      if (loaderDone.get()) {
        off();
        resolve();
      }
    });
  });
}

export function scrollToTarget(target: string | number | HTMLElement) {
  const lenis = lenisStore.get();
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.6 });
    return;
  }
  if (typeof target === "number") window.scrollTo({ top: target });
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView();
  }
}

/* ── Toasts ───────────────────────────────────────────────── */

export type ToastItem = { id: number; text: string };
export const toasts = createStore<ToastItem[]>([]);
let toastId = 0;

/** Small mono notification, gone after a couple of seconds. */
export function toast(text: string, ms = 2200) {
  const id = ++toastId;
  toasts.set([...toasts.get().slice(-2), { id, text }]);
  window.setTimeout(() => toasts.set(toasts.get().filter((t) => t.id !== id)), ms);
}

/** Pending page transition label (the case title painted on the shutter). */
export type TransitionState = { label: string; phase: "idle" | "cover" | "reveal"; href?: string };
export const transition = createStore<TransitionState>({ label: "", phase: "idle" });
