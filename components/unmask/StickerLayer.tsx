"use client";

import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from "react";
import { BlackBeltSticker, HydSticker, SihSticker, StateChampSticker, TopFiveSticker } from "./UnmaskStickers";
import { useStickerPhysics } from "@/lib/useStickerPhysics";
import s from "./unmask.module.css";

type Def = { id: string; label: string; w: number; x: number; y: number; r: number; Art: ComponentType; compact?: boolean };

// Centres as fractions of the stage; placed on the portrait edges and over the wordmark.
const STICKERS: Def[] = [
  { id: "belt", label: "Black belt", w: 220, x: 0.2, y: 0.42, r: -7, Art: BlackBeltSticker, compact: true },
  { id: "champ", label: "State champ", w: 128, x: 0.79, y: 0.36, r: 9, Art: StateChampSticker, compact: true },
  { id: "top5", label: "Top 5 every time", w: 236, x: 0.66, y: 0.66, r: -4, Art: TopFiveSticker, compact: true },
  { id: "sih", label: "SIH · ISRO", w: 196, x: 0.27, y: 0.62, r: 5, Art: SihSticker },
  { id: "hyd", label: "HYD", w: 88, x: 0.93, y: 0.56, r: -10, Art: HydSticker },
];

type Props = {
  /** Live spotlight (stage px) so stickers can swell while dragged over it. */
  spot: RefObject<{ x: number; y: number; r: number }>;
};

/** Draggable stickers with inertia. Over the spotlight they scale up slightly. */
export default function StickerLayer({ spot }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const els = useRef<Array<HTMLDivElement | null>>([]);
  const [compact, setCompact] = useState<boolean | null>(null);

  useEffect(() => {
    setCompact(window.matchMedia("(max-width: 760px)").matches);
  }, []);

  const list = compact ? STICKERS.filter((d) => d.compact) : STICKERS;

  return compact === null ? null : <Board key={String(compact)} list={list} layerRef={layerRef} els={els} spot={spot} />;
}

function Board({
  list,
  layerRef,
  els,
  spot,
}: {
  list: Def[];
  layerRef: RefObject<HTMLDivElement | null>;
  els: RefObject<Array<HTMLDivElement | null>>;
  spot: Props["spot"];
}) {
  useStickerPhysics(layerRef, els, list, {
    scaleFor: (width) => Math.max(0.55, Math.min(1, width / 1400)),
    onDrag: (b) => {
      const sp = spot.current;
      // The spot is in stage px; on desktop the board is anchored to the portrait frame, not the stage.
      const wrap = layerRef.current?.parentElement;
      const cx = b.x + b.w / 2 + (wrap?.offsetLeft ?? 0);
      const cy = b.y + b.h / 2 + (wrap?.offsetTop ?? 0);
      b.el.dataset.hot = String(sp.r > 20 && Math.hypot(cx - sp.x, cy - sp.y) < sp.r * 0.8);
    },
    onRelease: (b) => {
      b.el.dataset.hot = "false";
    },
  });

  return (
    <div ref={layerRef} className={s.stickers}>
      {list.map((d, i) => (
        <div
          key={d.id}
          ref={(el) => {
            els.current[i] = el;
          }}
          className={s.sticker}
          style={{ "--w": `${d.w}px`, transform: `rotate(${d.r}deg)` } as CSSProperties}
          tabIndex={0}
          role="group"
          aria-roledescription="draggable sticker"
          aria-label={`${d.label}. Drag, or use arrow keys to move.`}
          data-cursor="DRAG"
          data-sticker=""
        >
          <span className={s.stickerInner}>
            <d.Art />
          </span>
        </div>
      ))}
    </div>
  );
}
