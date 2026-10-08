import { ImageResponse } from "next/og";
import { PERSON } from "@/lib/content";

/**
 * The odometer, as a 1200×630 share card: red machine panel, black housing,
 * white drums. Fonts are the site's own (Archivo, JetBrains Mono, Instrument
 * Serif), fetched as subset TTFs from Google Fonts at build time, the same
 * source next/font uses. If the fetch fails the card still renders in the
 * default face.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const RED = "#e3170a";
const INK = "#0d0d0d";
const CREAM = "#fff6ee";
const SIGNAL = "#c8ff2e";

type FontSpec = { name: string; family: string; axes: string; weight: 400 | 500 | 900; style: "normal" | "italic" };

const ARCHIVO: FontSpec = { name: "Archivo", family: "Archivo", axes: "wdth,wght@78,900", weight: 900, style: "normal" };
const MONO: FontSpec = { name: "JetBrains Mono", family: "JetBrains+Mono", axes: "wght@500", weight: 500, style: "normal" };
const SERIF: FontSpec = { name: "Instrument Serif", family: "Instrument+Serif", axes: "ital@1", weight: 400, style: "italic" };

async function loadFont(spec: FontSpec, text: string) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${spec.family}:${spec.axes}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const data = await (await fetch(url)).arrayBuffer();
    return { name: spec.name, data, weight: spec.weight, style: spec.style };
  } catch {
    return null;
  }
}

/** Break text into drum rows of at most `max` cells, on word boundaries where possible. */
function toRows(text: string, max: number) {
  const rows: string[] = [];
  let row = "";
  for (const word of text.toUpperCase().split(/\s+/).filter(Boolean)) {
    const next = row ? `${row} ${word}` : word;
    if (next.length <= max) row = next;
    else {
      if (row) rows.push(row);
      row = word.slice(0, max);
    }
  }
  if (row) rows.push(row);
  return rows.slice(0, 4);
}

type Props = { drums: string; kicker: string; caption: string };

export async function odometerImage({ drums, kicker, caption }: Props) {
  const rows = toRows(drums, 16);
  const longest = Math.max(...rows.map((r) => r.length));
  const cell = Math.floor(Math.min(1040 / longest - 8, 340 / rows.length / 1.32, 118));
  const glyphs = `${rows.join("")}${kicker}${caption}${PERSON.base}0123456789·/ `;
  const fonts = (await Promise.all([loadFont(ARCHIVO, rows.join("") + "0123456789"), loadFont(MONO, `${glyphs}ARMAN ACHARYA`.toUpperCase()), loadFont(SERIF, caption)])).filter(
    (f): f is NonNullable<typeof f> => f !== null,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 64px",
          background: `radial-gradient(circle at 30% 20%, #ff2a17 0%, ${RED} 45%, #b80f05 100%)`,
          color: CREAM,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "JetBrains Mono", fontSize: 22, letterSpacing: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: SIGNAL }} />
            {kicker.toUpperCase()}
          </div>
          <div style={{ display: "flex" }}>ARMAN ACHARYA</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "22px 24px",
            borderRadius: 18,
            background: `linear-gradient(180deg, #262626 0%, ${INK} 40%, #030303 100%)`,
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.7)",
          }}
        >
          {rows.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 8 }}>
              {row.split("").map((ch, i) => (
                <div
                  key={i}
                  style={{
                    width: cell,
                    height: Math.round(cell * 1.32),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    background: ch === " " ? "#1a1a1a" : "linear-gradient(180deg, #9d9890 0%, #f3f1ec 22%, #ffffff 50%, #f3f1ec 78%, #9d9890 100%)",
                    color: INK,
                    fontFamily: "Archivo",
                    fontSize: Math.round(cell * 1.02),
                    lineHeight: 1,
                  }}
                >
                  {ch === " " ? "" : ch}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 40, maxWidth: 860, lineHeight: 1.1 }}>{caption}</div>
          <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontSize: 18, letterSpacing: 3, opacity: 0.8 }}>{PERSON.base.toUpperCase()}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
