"use client";

import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from "react";
import {
  CHARSET,
  DrumBank,
  FACE_OFFSETS,
  charAt,
  faceTransform,
  padText,
  type RollOptions,
} from "@/lib/drums";
import { observeVisibility, prefersReducedMotion } from "@/lib/hooks";
import { playClick } from "@/lib/sound";

export type DrumsHandle = {
  roll: (text: string, options?: RollOptions) => Promise<void>;
  set: (text: string) => void;
  scramble: () => void;
  setCharset: (charset: string) => void;
  flick: (index: number) => void;
  readonly text: string;
  readonly root: HTMLElement | null;
};

type Props = {
  count: number;
  initial?: string;
  charset?: string;
  /** Click on every landing (only audible when sound is on). */
  sound?: boolean;
  /** Hovering a drum flicks it. */
  flick?: boolean;
  /** Bare drums: no paper faces, mono type, inherit colour. */
  bare?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<DrumsHandle>;
};

const RESTING = FACE_OFFSETS.map((o) => faceTransform(o));

export default function OdometerDrums({
  count,
  initial = "",
  charset = CHARSET,
  sound = false,
  flick = false,
  bare = false,
  className = "",
  style,
  ref,
}: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const bankRef = useRef<DrumBank | null>(null);
  const chars = padText(initial, count).split("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const bank = new DrumBank(root, { charset, onLand: sound ? playClick : undefined });
    bank.reduced = prefersReducedMotion();
    bankRef.current = bank;

    const stopObserving = observeVisibility(root, (v) => bank.setVisible(v), "120px");

    return () => {
      stopObserving();
      bank.destroy();
      bankRef.current = null;
    };
    // The bank owns the DOM after mount; props are read once by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      roll: (text, options) => bankRef.current?.roll(text, options) ?? Promise.resolve(),
      set: (text) => bankRef.current?.set(text),
      scramble: () => bankRef.current?.scramble(),
      setCharset: (cs) => bankRef.current?.setCharset(cs),
      flick: (i) => bankRef.current?.flick(i),
      get text() {
        return bankRef.current?.text ?? padText(initial, count);
      },
      get root() {
        return rootRef.current;
      },
    }),
    [count, initial],
  );

  return (
    <span
      ref={rootRef}
      className={`drums${bare ? " drums--bare" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {chars.map((ch, i) => {
        const index = Math.max(0, charset.indexOf(ch));
        return (
          <span
            key={i}
            className="drum"
            data-drum=""
            onPointerEnter={flick ? () => bankRef.current?.flick(i) : undefined}
          >
            {FACE_OFFSETS.map((o, k) => (
              <span
                key={k}
                className="drum__face"
                data-face=""
                style={RESTING[k] ? { transform: RESTING[k] } : { opacity: 0 }}
              >
                {charAt(charset, index + o)}
              </span>
            ))}
            {!bare && <span className="drum__shade" />}
          </span>
        );
      })}
    </span>
  );
}
