import type { CSSProperties } from "react";
import { FLYERS } from "@/lib/content";
import s from "./radio.module.css";

const TILTS = [-7, 4, -2];

export default function FlyerWall() {
  return (
    <div className={s.flyers}>
      <p className={`label ${s.flyersLabel}`}>Flyer wall · Club Literati</p>
      <ul className={s.flyerList}>
        {FLYERS.map((name, i) => (
          // TODO: add real flyer images (Interaction Day, Murder Mystery, and more).
          <li key={name} className={s.flyer} style={{ "--tilt": `${TILTS[i % TILTS.length]}deg` } as CSSProperties}>
            <span className={s.tape} aria-hidden="true" />
            <div className={`placeholder ${s.flyerFrame}`}>
              <span className={`display ${s.flyerName}`}>{name}</span>
              <span className="placeholder__tag">Flyer · TODO</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
