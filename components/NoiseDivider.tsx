/**
 * Hand-cut torn-paper edge between a paper section and an asphalt one.
 * Pure SVG, deterministic, so server and client draw the same tear.
 */

type Tone = "paper" | "asphalt";
const COLOR: Record<Tone, string> = { paper: "#f3f1ec", asphalt: "#141414" };

function tearPath(seed: number, width = 1440, height = 44) {
  let t = seed * 7919 + 17;
  const rand = () => {
    t = (t * 16807) % 2147483647;
    return t / 2147483647;
  };
  const pts: string[] = [`M0 ${height}`, `L0 ${height * 0.5}`];
  let x = 0;
  while (x < width) {
    x += 6 + rand() * 18;
    // Mostly small teeth, with the occasional deeper rip.
    const deep = rand() > 0.88 ? rand() * 14 : 0;
    const y = height * 0.28 + rand() * height * 0.34 + deep;
    pts.push(`L${Math.min(x, width).toFixed(1)} ${y.toFixed(1)}`);
  }
  pts.push(`L${width} ${height}`, "Z");
  return pts.join("");
}

type Props = { top: Tone; bottom: Tone; seed?: number };

export default function NoiseDivider({ top, bottom, seed = 1 }: Props) {
  const d = tearPath(seed);
  return (
    <div aria-hidden="true" style={{ position: "relative", zIndex: 1, height: 44, marginTop: -1, marginBottom: -1, background: COLOR[top], lineHeight: 0 }}>
      <svg viewBox="0 0 1440 44" preserveAspectRatio="none" width="100%" height="44" style={{ display: "block" }}>
        {/* Fibres: the torn paper shows a pale, slightly offset edge. */}
        <path d={d} fill={COLOR.paper} opacity={top === "paper" ? 0 : 0.55} transform="translate(0 -2.2)" />
        <path d={d} fill={COLOR[bottom]} />
        {top === "paper" && <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
  );
}
