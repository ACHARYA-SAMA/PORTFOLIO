"use client";

import { useRef, type ComponentType, type CSSProperties } from "react";
import { EnfieldSticker, GamesSticker, TalismanSticker, VinylSticker } from "./Stickers";
import { useStickerPhysics } from "@/lib/useStickerPhysics";
import { OFF_TRACK_FACTS } from "@/lib/content";
import s from "./offtrack.module.css";

type StickerDef = { id: string; label: string; w: number; h: number; x: number; y: number; r: number; Art: ComponentType };

// x/y are the sticker centres as fractions of the board.
const STICKERS: StickerDef[] = [
  { id: "enfield", label: OFF_TRACK_FACTS.ride, w: 250, h: 250, x: 0.15, y: 0.27, r: -9, Art: EnfieldSticker },
  { id: "games", label: OFF_TRACK_FACTS.games.join(" · "), w: 320, h: 183, x: 0.52, y: 0.18, r: 5, Art: GamesSticker },
  { id: "anime", label: OFF_TRACK_FACTS.anime, w: 150, h: 300, x: 0.83, y: 0.38, r: -5, Art: TalismanSticker },
  { id: "repeat", label: OFF_TRACK_FACTS.music, w: 240, h: 240, x: 0.4, y: 0.68, r: 11, Art: VinylSticker },
];

/** Fling the stickers around. They lose speed to friction and bounce softly off the edges. */
export default function StickerBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const els = useRef<Array<HTMLDivElement | null>>([]);

  useStickerPhysics(boardRef, els, STICKERS, {
    scaleFor: (width) => Math.max(0.52, Math.min(1, width / 1100)),
  });

  return (
    <div ref={boardRef} className={s.board}>
      {STICKERS.map((st, i) => (
        <div
          key={st.id}
          ref={(el) => {
            els.current[i] = el;
          }}
          className={s.sticker}
          style={{ "--w": `${st.w}px`, "--h": `${st.h}px`, transform: `rotate(${st.r}deg)` } as CSSProperties}
          tabIndex={0}
          role="group"
          aria-roledescription="draggable sticker"
          aria-label={`${st.label}. Drag, or use arrow keys to move.`}
          data-cursor="DRAG"
        >
          <st.Art />
        </div>
      ))}
    </div>
  );
}
