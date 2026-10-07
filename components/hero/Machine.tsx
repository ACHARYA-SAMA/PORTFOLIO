"use client";

import type { KeyboardEvent, Ref, RefObject } from "react";
import OdometerDrums, { type DrumsHandle } from "@/components/OdometerDrums";
import Plate, { type PlateHandle } from "./Plate";
import Knob from "./Knob";
import CardSlot from "./CardSlot";
import s from "./hero.module.css";

type Props = {
  machineRef: RefObject<HTMLDivElement | null>;
  counterRef: RefObject<HTMLDivElement | null>;
  captionRef: RefObject<HTMLParagraphElement | null>;
  drumsRef: Ref<DrumsHandle>;
  plateRef: Ref<PlateHandle>;
  initialCaption: string;
  sceneCount: number;
  onNext: () => void;
  onPull: () => void;
  onCounterFocus: (focused: boolean) => void;
};

export default function Machine({
  machineRef,
  counterRef,
  captionRef,
  drumsRef,
  plateRef,
  initialCaption,
  sceneCount,
  onNext,
  onPull,
  onCounterFocus,
}: Props) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div ref={machineRef} className={s.machine}>
      <Plate ref={plateRef} total={sceneCount} />

      <div className={s.counterRow}>
        <i className={`${s.screw} ${s.screwTL}`} aria-hidden="true" />
        <i className={`${s.screw} ${s.screwTR}`} aria-hidden="true" />
        <i className={`${s.screw} ${s.screwBL}`} aria-hidden="true" />
        <i className={`${s.screw} ${s.screwBR}`} aria-hidden="true" />

        <div
          ref={counterRef}
          className={s.window}
          role="button"
          tabIndex={0}
          aria-label="Rolling counter. Press for the next scene, or scroll over it to step through scenes."
          data-cursor="SPIN"
          data-lenis-prevent=""
          onClick={onNext}
          onKeyDown={onKeyDown}
          onFocus={() => onCounterFocus(true)}
          onBlur={() => onCounterFocus(false)}
        >
          <OdometerDrums ref={drumsRef} count={9} initial="ARMAN" sound flick className={s.drums} />
          <span className={s.glass} aria-hidden="true" />
        </div>

        <span className={`label ${s.engrave}`} aria-hidden="true">
          Roll ↑ · 9 drums
        </span>
        <span className={`label ${s.engrave} ${s.engraveRight}`} aria-hidden="true">
          Click · scroll · pull
        </span>

        <CardSlot className={s.slotPos} />
      </div>

      <Knob onPull={onPull} />

      <p
        ref={captionRef}
        className={s.caption}
        aria-live="polite"
        dangerouslySetInnerHTML={{ __html: initialCaption }}
      />
    </div>
  );
}
