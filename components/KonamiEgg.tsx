"use client";

import { useEffect } from "react";
import { emit } from "@/lib/events";
import { toast } from "@/lib/store";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** ↑↑↓↓←→←→BA: the odometer spells RAJ and the armour reveal fires. */
export default function KonamiEgg() {
  useEffect(() => {
    let i = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = key === CODE[i] ? i + 1 : key === CODE[0] ? 1 : 0;
      if (i === CODE.length) {
        i = 0;
        emit("konami");
        emit("unmask:reveal");
        toast("Cheat code accepted");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
