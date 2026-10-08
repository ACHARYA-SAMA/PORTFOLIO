import type { PadGlyph as Glyph } from "@/lib/shortcuts";

const FACE: Record<string, [number, number]> = { south: [12, 19], east: [19, 12], west: [5, 12], north: [12, 5] };

/** Brand-neutral gamepad glyphs: position, not a console's lettering. */
export default function PadGlyph({ glyph }: { glyph: Glyph }) {
  const stroke = "currentColor";
  let body: React.ReactNode;
  if (glyph in FACE) {
    body = Object.entries(FACE).map(([k, [x, y]]) => <circle key={k} cx={x} cy={y} r={3.2} fill={k === glyph ? stroke : "none"} stroke={stroke} strokeWidth={1.3} />);
  } else if (glyph === "lt" || glyph === "rt") {
    body = (
      <>
        <path d="M6 18V9a6 6 0 0 1 12 0v9z" fill="none" stroke={stroke} strokeWidth={1.4} />
        <text x={12} y={16} textAnchor="middle" fontSize={7} fontFamily="monospace" fill={stroke}>
          {glyph === "lt" ? "L" : "R"}
        </text>
      </>
    );
  } else if (glyph === "lb" || glyph === "rb") {
    body = (
      <>
        <rect x={3} y={8} width={18} height={8} rx={3} fill="none" stroke={stroke} strokeWidth={1.4} />
        <text x={12} y={14.5} textAnchor="middle" fontSize={6.5} fontFamily="monospace" fill={stroke}>
          {glyph === "lb" ? "L" : "R"}
        </text>
      </>
    );
  } else if (glyph === "lstick" || glyph === "rstick") {
    body = (
      <>
        <circle cx={12} cy={12} r={9} fill="none" stroke={stroke} strokeWidth={1.4} />
        <circle cx={12} cy={12} r={4.5} fill={stroke} />
        <text x={12} y={14.3} textAnchor="middle" fontSize={6} fontFamily="monospace" fill="var(--color-ink)">
          {glyph === "lstick" ? "L" : "R"}
        </text>
      </>
    );
  } else if (glyph === "dpad") {
    body = <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="none" stroke={stroke} strokeWidth={1.4} />;
  } else {
    body = (
      <>
        <rect x={4} y={9} width={16} height={6} rx={3} fill="none" stroke={stroke} strokeWidth={1.4} />
        {glyph === "start" ? <path d="M10.5 10.5l3 1.5-3 1.5z" fill={stroke} /> : <path d="M9.5 12h5" stroke={stroke} strokeWidth={1.4} />}
      </>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true">
      {body}
    </svg>
  );
}
