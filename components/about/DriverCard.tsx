import TiltCard from "@/components/ui/TiltCard";
import { LICENCE_FIELDS } from "@/lib/content";
import s from "./about.module.css";

// Decorative barcode, fixed so server and client render the same bars.
const BARS = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 1, 2, 2, 1, 3];

/** Race-licence style card. Tilts with the mouse, a sheen follows the cursor. */
export default function DriverCard() {
  return (
    <TiltCard className={s.cardWrap} innerClassName={s.licence} sheenClassName={s.sheen}>
      <div className={s.licenceBand}>
        <span className="label">Driver profile</span>
        <span className={s.checker} aria-hidden="true" />
      </div>

      <div className={s.licenceBody}>
        {/* TODO: add Arman's photo (portrait, roughly 4:5). */}
        <div className={`placeholder ${s.photo}`}>
          <span className="placeholder__tag">
            Photo
            <br />
            TODO
          </span>
        </div>

        <dl className={s.fields}>
          {LICENCE_FIELDS.map((f) => (
            <div key={f.key} className={s.field}>
              <dt className={s.fieldKey}>{f.key}</dt>
              <dd className={s.fieldValue}>
                {f.live && <span className={s.liveDot} aria-hidden="true" />}
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={s.licenceFoot} aria-hidden="true">
        <span className={s.barcode}>
          {BARS.map((w, i) => (
            <i key={i} style={{ width: w }} />
          ))}
        </span>
        <span className={`label ${s.footText}`}>Raj · HYD</span>
      </div>
    </TiltCard>
  );
}
