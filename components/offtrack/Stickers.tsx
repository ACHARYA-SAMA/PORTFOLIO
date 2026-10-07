/* Flat, hand-drawn sticker art. No emoji, no icon packs, no logos. */

const CUT = "#ffffff";
const INK = "#0d0d0d";
const RED = "#e3170a";
const CREAM = "#fff6ee";

export function EnfieldSticker() {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Sticker: rides, mostly Royal Enfields">
      <defs>
        <path id="enfield-top" d="M35 120a85 85 0 0 1 170 0" />
        <path id="enfield-bottom" d="M21 120a99 99 0 0 0 198 0" />
      </defs>
      <circle cx="120" cy="120" r="118" fill={CUT} />
      <circle cx="120" cy="120" r="110" fill={RED} />
      <circle cx="120" cy="120" r="76" fill={CREAM} />
      <circle cx="120" cy="120" r="76" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="3 5" />
      <text fill={CREAM} fontFamily="var(--font-mono)" fontWeight="700" fontSize="15" letterSpacing="3.5">
        <textPath href="#enfield-top" startOffset="50%" textAnchor="middle">
          RIDES. MOSTLY
        </textPath>
      </text>
      <text fill={CREAM} fontFamily="var(--font-mono)" fontWeight="700" fontSize="15" letterSpacing="3">
        <textPath href="#enfield-bottom" startOffset="50%" textAnchor="middle">
          ROYAL ENFIELDS.
        </textPath>
      </text>
      <circle cx="31" cy="120" r="3" fill={CREAM} />
      <circle cx="209" cy="120" r="3" fill={CREAM} />

      {/* Classic roadster, side on */}
      <g transform="translate(62 86) scale(0.58)" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="86" r="26" fill="none" stroke={INK} strokeWidth="9" />
        <circle cx="160" cy="86" r="26" fill="none" stroke={INK} strokeWidth="9" />
        <circle cx="40" cy="86" r="5" fill={INK} />
        <circle cx="160" cy="86" r="5" fill={INK} />
        <path d="M8 74 Q14 48 48 48" fill="none" stroke={INK} strokeWidth="7" />
        <path d="M40 86 L86 84 L122 52 M48 56 L40 86 M160 86 L140 34" fill="none" stroke={INK} strokeWidth="7" />
        <rect x="74" y="60" width="40" height="30" rx="6" fill={INK} />
        <path d="M86 44 C96 24 134 24 144 40 C146 48 138 52 128 52 L92 52 Z" fill={RED} stroke={INK} strokeWidth="3" />
        <path d="M44 44 L90 40 L92 52 L50 56 Z" fill={INK} />
        <path d="M50 102 L120 97" fill="none" stroke={INK} strokeWidth="7" />
        <path d="M126 28 L146 24 L154 32" fill="none" stroke={INK} strokeWidth="5" />
        <circle cx="151" cy="44" r="10" fill={CREAM} stroke={INK} strokeWidth="5" />
      </g>
    </svg>
  );
}

export function GamesSticker() {
  return (
    <svg viewBox="0 0 300 172" role="img" aria-label="Sticker: Valorant, CS2, God of War, GTA V">
      <rect x="0" y="0" width="300" height="172" rx="26" fill={CUT} />
      <rect x="7" y="7" width="286" height="158" rx="20" fill={INK} />
      <g transform="translate(76 86)" fill="none" stroke={RED} strokeWidth="4" strokeLinecap="round">
        <circle r="38" />
        <circle r="20" strokeWidth="2" strokeDasharray="4 5" />
        <path d="M0 -54V-26M0 26V54M-54 0H-26M26 0H54" />
        <circle r="4" fill={RED} stroke="none" />
      </g>
      <text x="132" y="46" fill="rgba(255,246,238,0.55)" fontFamily="var(--font-mono)" fontSize="11" fontWeight="600" letterSpacing="3">
        GAMES
      </text>
      <g fill={CREAM} fontFamily="var(--font-display)" fontWeight="900" fontSize="20" style={{ fontStretch: "75%" }}>
        <text x="132" y="80" textLength="146" lengthAdjust="spacingAndGlyphs">VALORANT · CS2</text>
        <text x="132" y="110">GOD OF WAR</text>
        <text x="132" y="140">· GTA V</text>
      </g>
    </svg>
  );
}

export function TalismanSticker() {
  return (
    <svg viewBox="0 0 150 300" role="img" aria-label="Sticker: Jujutsu Kaisen">
      <rect x="0" y="0" width="150" height="300" rx="12" fill={CUT} />
      <rect x="7" y="7" width="136" height="286" rx="6" fill="#f6ecd6" />
      <rect x="15" y="15" width="120" height="270" fill="none" stroke={RED} strokeWidth="3" />
      <rect x="21" y="21" width="108" height="258" fill="none" stroke={RED} strokeWidth="1" />
      <g transform="translate(75 66)">
        <circle r="30" fill={RED} />
        <circle r="22" fill="none" stroke="#f6ecd6" strokeWidth="2" />
        <path d="M-10 -8h20M0 -14v28M-12 6c6 4 18 4 24 0" fill="none" stroke="#f6ecd6" strokeWidth="3" strokeLinecap="round" />
      </g>
      <text
        transform="translate(66 112) rotate(90)"
        fill={INK}
        fontFamily="var(--font-mono)"
        fontWeight="700"
        fontSize="16"
        letterSpacing="3.2"
      >
        JUJUTSU KAISEN
      </text>
      <path d="M100 118c6 40-6 80 4 120M110 150c-4 30 6 60-2 96" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function VinylSticker() {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Sticker: on repeat, Karan Aujla">
      <circle cx="120" cy="120" r="118" fill={CUT} />
      <g data-spin="">
        <circle cx="120" cy="120" r="110" fill={INK} />
        {[100, 92, 84, 76, 68, 60].map((r) => (
          <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="#2b2b2b" strokeWidth="1.4" />
        ))}
        <path d="M120 120L196 44A108 108 0 0 1 224 92Z" fill="rgba(255,255,255,0.08)" />
        <path d="M120 120L44 196A108 108 0 0 1 16 148Z" fill="rgba(255,255,255,0.05)" />
        <circle cx="120" cy="120" r="46" fill={RED} />
        <text x="120" y="102" textAnchor="middle" fill={CREAM} fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="700" letterSpacing="2.5">
          ON REPEAT
        </text>
        <g fill={CREAM} fontFamily="var(--font-display)" fontWeight="900" fontSize="19" textAnchor="middle" style={{ fontStretch: "75%" }}>
          <text x="120" y="130">KARAN</text>
          <text x="120" y="150">AUJLA</text>
        </g>
        <circle cx="120" cy="113" r="3.5" fill={INK} />
      </g>
    </svg>
  );
}
