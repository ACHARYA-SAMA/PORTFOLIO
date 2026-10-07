"use client";

/** Tiny typed event bus for page-wide moments (easter eggs, reveals). */

type Events = {
  konami: void;
  "unmask:reveal": void;
};

type Handler = () => void;
const handlers = new Map<keyof Events, Set<Handler>>();

export function on(name: keyof Events, handler: Handler) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name)!.add(handler);
  return () => {
    handlers.get(name)?.delete(handler);
  };
}

export function emit(name: keyof Events) {
  handlers.get(name)?.forEach((h) => h());
}
