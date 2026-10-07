"use client";

import { setSound } from "@/lib/sound";
import { soundOn, toast, useStore } from "@/lib/store";

export default function SoundToggle({ className = "", barsClassName = "" }: { className?: string; barsClassName?: string }) {
  const on = useStore(soundOn, false);

  return (
    <button
      type="button"
      className={`label ${className}`}
      aria-pressed={on}
      onClick={() => {
        setSound(!on);
        toast(on ? "Sound off" : "Sound on");
      }}
      data-cursor={on ? "MUTE" : "LISTEN"}
    >
      <span className={barsClassName} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      Sound<span className="sr-only">{on ? " on" : " off"}</span>
    </button>
  );
}
