/* Flat vector stickers for the Unmask scene. Each has a peel corner; the
   hard drop shadow comes from CSS so it stays crisp while dragging. */

const INK = "#0d0d0d";
const RED = "#e3170a";
const CREAM = "#fff6ee";
const PAPER = "#f3f1ec";
const FOLD = "#d9d4c9";

/** Rectangle with its top-right corner folded back. */
function PeelRect({ w, h, fill, peel = 22, rx = 8 }: { w: number; h: number; fill: string; peel?: number; rx?: number }) {
  return (
    <>
      <path d={`M${rx} 0H${w - peel}L${w} ${peel}V${h - rx}Q${w} ${h} ${w - rx} ${h}H${rx}Q0 ${h} 0 ${h - rx}V${rx}Q0 0 ${rx} 0Z`} fill={fill} />
      <path d={`M${w - peel} 0L${w - peel} ${peel - 3}Q${w - peel} ${peel} ${w - peel + 3} ${peel}L${w} ${peel}Z`} fill={FOLD} />
      <path d={`M${w - peel} ${peel}L${w} ${peel}L${w - peel + 4} ${peel + 4}Z`} fill="rgba(0,0,0,0.18)" />
    </>
  );
}

export function BlackBeltSticker() {
  return (
    <svg viewBox="0 0 232 78" role="img" aria-label="Sticker: black belt">
      <PeelRect w={232} h={78} fill={INK} />
      <g transform="translate(20 22)" fill={CREAM}>
        <rect x="0" y="12" width="44" height="10" rx="2" />
        <path d="M16 4h12l4 26H12z" />
        <path d="M18 24l-10 22 7 2 9-22zM26 24l10 22-7 2-9-22z" />
      </g>
      <text x="76" y="50" fill={CREAM} fontFamily="var(--font-display)" fontWeight="900" fontSize="30" style={{ fontStretch: "75%" }}>
        BLACK BELT
      </text>
    </svg>
  );
}

export function StateChampSticker() {
  return (
    <svg viewBox="0 0 140 140" role="img" aria-label="Sticker: state champion">
      <path d="M70 2l14 10 17-2 7 16 16 7-2 17 10 14-10 14 2 17-16 7-7 16-17-2-14 10-14-10-17 2-7-16-16-7 2-17L2 70l10-14-2-17 16-7 7-16 17 2z" fill={RED} />
      <circle cx="70" cy="70" r="48" fill="none" stroke={CREAM} strokeWidth="2" strokeDasharray="3 4" />
      <path d="M70 26c1.2 7.8 7.2 13.8 15 15-7.8 1.2-13.8 7.2-15 15-1.2-7.8-7.2-13.8-15-15 7.8-1.2 13.8-7.2 15-15Z" fill={CREAM} />
      <g fill={CREAM} fontFamily="var(--font-display)" fontWeight="900" textAnchor="middle" style={{ fontStretch: "75%" }}>
        <text x="70" y="82" fontSize="22">STATE</text>
        <text x="70" y="104" fontSize="22">CHAMP</text>
      </g>
    </svg>
  );
}

export function TopFiveSticker() {
  return (
    <svg viewBox="0 0 250 84" role="img" aria-label="Sticker: top five every time">
      <PeelRect w={250} h={84} fill={PAPER} />
      <rect x="10" y="10" width="62" height="64" rx="4" fill={RED} />
      <text x="41" y="62" textAnchor="middle" fill={CREAM} fontFamily="var(--font-display)" fontWeight="900" fontSize="52" style={{ fontStretch: "75%" }}>
        5
      </text>
      <text x="86" y="38" fill={INK} fontFamily="var(--font-mono)" fontWeight="700" fontSize="12" letterSpacing="3">
        TOP 5
      </text>
      <text x="86" y="64" fill={INK} fontFamily="var(--font-display)" fontWeight="900" fontSize="26" style={{ fontStretch: "75%" }}>
        EVERY TIME
      </text>
    </svg>
  );
}

export function SihSticker() {
  return (
    <svg viewBox="0 0 210 70" role="img" aria-label="Sticker: Smart India Hackathon, ISRO problem statement">
      <PeelRect w={210} h={70} fill={CREAM} rx={35} peel={18} />
      <g transform="translate(36 35)" fill="none" stroke={INK} strokeWidth="2.5">
        <circle r="9" fill={INK} />
        <ellipse rx="22" ry="8" transform="rotate(-24)" />
        <circle cx="19" cy="-9" r="3" fill={RED} stroke="none" />
      </g>
      <text x="70" y="44" fill={INK} fontFamily="var(--font-display)" fontWeight="900" fontSize="26" style={{ fontStretch: "75%" }}>
        SIH · ISRO
      </text>
    </svg>
  );
}

export function HydSticker() {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="Sticker: HYD, Hyderabad">
      <PeelRect w={96} h={96} fill={INK} peel={18} />
      <text x="12" y="30" fill="rgba(255,246,238,0.6)" fontFamily="var(--font-mono)" fontWeight="600" fontSize="10" letterSpacing="2">
        BASE
      </text>
      <text x="10" y="76" fill={CREAM} fontFamily="var(--font-display)" fontWeight="900" fontSize="40" style={{ fontStretch: "75%" }}>
        HYD
      </text>
    </svg>
  );
}
