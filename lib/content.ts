/**
 * Every word on the site lives here, taken verbatim from the brief.
 * Nothing in this file is invented. If a fact is missing, it is missing
 * on purpose: see TODO.md.
 */

export const PERSON = {
  name: "Arman Acharya",
  callsign: "Raj",
  base: "Hyderabad, IN",
  programme: "B.Tech CSE (Data Science)",
  institute: "MLRIT",
  status: "Open to projects",
};

// TODO: verify contact details with Arman before launch.
export const CONTACT = {
  email: "25r21a6704@mlrit.ac.in",
  linkedin: { label: "linkedin.com/in/arman-acharya", href: "https://linkedin.com/in/arman-acharya" },
  github: { label: "github.com/arman-acharya", href: "https://github.com/arman-acharya" },
  // The printable CV page, generated from this file (print to PDF from there).
  cv: "/portfolio/cv",
};

/* ── Chapters (ChapterIndex, command palette, section eyebrows) ── */

export const CHAPTERS = [
  { id: "unmask", label: "Unmask" },
  { id: "machine", label: "Machine" },
  { id: "marquee", label: "Marquee" },
  { id: "about", label: "Driver profile" },
  { id: "stats", label: "Stat dials" },
  { id: "race-log", label: "Race log" },
  { id: "garage", label: "The Garage" },
  { id: "telemetry", label: "Telemetry" },
  { id: "radio", label: "Team radio" },
  { id: "off-track", label: "Off the track" },
  { id: "contact", label: "Pit exit" },
  { id: "footer", label: "Footer" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

/** "04" for the about section, etc. One source for every eyebrow number. */
export function chapterNo(id: ChapterId) {
  return String(CHAPTERS.findIndex((c) => c.id === id) + 1).padStart(2, "0");
}

/* ── Act I: Unmask ────────────────────────────────────────── */

export const UNMASK = {
  eyebrow: "Hover to unmask",
  subline: "CSE (Data Science) · Frontend · CV · Design",
  aka: "(also Raj)",
};

/* ── Act II: the machine ──────────────────────────────────── */

export type Scene = { drums: string | "DATE"; caption: string };

/** `*asterisks*` mark black italic words, and can span several words. */
export const SCENES: Scene[] = [
  { drums: "ARMAN", caption: "Hi, I’m Arman, *Raj* to friends. I build things that *move*." },
  { drums: "DATE", caption: "Today is a good day to *ship* something." },
  { drums: "FRONTEND", caption: "Frontend for SQUAD, *pixel by pixel*." },
  { drums: "AI + CV", caption: "Computer vision, *Kalman filters*, and models that actually run." },
  { drums: "HACKATHON", caption: "Top five in every one I entered. *One* first place." },
  { drums: "BLACKBELT", caption: "State champion. *Discipline* is a habit, not a mood." },
  { drums: "DESIGN", caption: "Vector layouts and flyers as *Lead Designer* at Club Literati." },
  { drums: "HIRE ME?", caption: "Open to new projects, *let’s talk*." },
];

export const HERO_RAIL = "CSE (Data Science) · Frontend · Computer Vision · Design";

export type CaptionWord = { text: string; em: boolean; glue: boolean };

/** Words with their emphasis. `glue` means no space before (punctuation after an italic run). */
export function parseCaption(caption: string): CaptionWord[] {
  const words: CaptionWord[] = [];
  let prevEndsSpace = true;
  caption.split("*").forEach((chunk, i) => {
    const em = i % 2 === 1;
    const tight = !prevEndsSpace && !/^\s/.test(chunk);
    chunk
      .split(/\s+/)
      .filter(Boolean)
      .forEach((text, j) => words.push({ text, em, glue: j === 0 && tight }));
    if (chunk.length > 0) prevEndsSpace = /\s$/.test(chunk);
  });
  return words;
}

/* ── Marquee ──────────────────────────────────────────────── */

export const MARQUEE_TOP = ["Frontend", "Computer Vision", "Hardware", "Design", "Hackathons"];
export const MARQUEE_BOTTOM = ["Next.js", "Three.js", "OpenCV", "Arduino", "Raspberry Pi", "Figma"];

/* ── About ────────────────────────────────────────────────── */

/** `*asterisks*` mark italic phrases (styling only, the words are verbatim). */
export const ABOUT_COPY = [
  "I’m Arman, but most people call me *Raj*. I study Computer Science and Engineering with a Data Science specialisation at MLR Institute of Technology in Hyderabad, and I spend most of my time where code meets the physical world: cameras that track, circuits that react, interfaces that feel alive.",
  "I enter hackathons to find out how I think under pressure. I’ve been top five in every one I’ve competed in, and I’ve taken first place once. The same habit comes from the dojo: I’m a black belt and a state-level karate champion, and that’s where I learned that *fundamentals beat flash*, and that you only get faster by repeating the boring part properly.",
  "I build frontends, I design, and I’m *not happy until both are good*.",
];

export const LICENCE_FIELDS: Array<{ key: string; value: string; live?: boolean }> = [
  { key: "Name", value: "Arman Acharya" },
  { key: "Callsign", value: "Raj" },
  { key: "Base", value: "Hyderabad, IN" },
  { key: "Programme", value: "B.Tech CSE (Data Science)" },
  { key: "Institute", value: "MLRIT" },
  { key: "Status", value: "Open to projects", live: true },
];

/* ── Stat dials ───────────────────────────────────────────── */

export const STATS = [
  // 05+ is a lower bound. Do not display a higher number.
  { value: "05+", from: "00 ", label: "Hackathons entered" },
  { value: "TOP 5", from: "     ", label: "Finish in every one" },
  { value: "01", from: "00", label: "First place" },
  { value: "01", from: "00", label: "State-level karate title" },
];

/* ── Race log ─────────────────────────────────────────────── */

export const RACE_INTRO =
  "Five-plus hackathons. Top five every time. One win. The result column is the least interesting part; the interesting part is what got built in the hours before it.";

export type RaceEntry = {
  id: string;
  name: string;
  kind: string;
  result: string;
  detail?: string;
  variant?: "wide" | "belt";
};

export const RACES: RaceEntry[] = [
  { id: "yantra", name: "Yantra Yugam", kind: "Hackathon", result: "Top 5" },
  { id: "techsprint", name: "GDGoC × MREM TechSprint", kind: "Hackathon", result: "Top 5" },
  { id: "bower", name: "Bower AI", kind: "Hackathon", result: "Top 5" },
  { id: "msme", name: "MSME Idea Hackathon 6.0", kind: "Hackathon", result: "Top 5" },
  { id: "zignasa", name: "ZIGNASA 2K25", kind: "Hackathon", result: "Finalist" },
  {
    id: "sih",
    name: "Smart India Hackathon",
    kind: "ISRO problem statement",
    result: "Cleared both internal and external campus evaluation rounds.",
    detail: "Built an AI-based virtual camera tracking system using an Extended Kalman Filter.",
    variant: "wide",
  },
  {
    id: "belt",
    name: "Black Belt & State-Level Champion",
    kind: "Martial arts",
    result: "State-level champion.",
    variant: "belt",
  },
];

/* ── Garage ───────────────────────────────────────────────── */

export type Project = {
  id: string;
  title: string;
  line?: string;
  tags: string[];
  flagship?: boolean;
};

export const PROJECTS: Project[] = [
  {
    id: "micro-sort",
    title: "Micro-Sort",
    line: "An AI-driven SCARA sorting robot for MSMEs. A 4-axis arm with YOLOv8-nano running on a Raspberry Pi 4, fully offline computer vision.",
    tags: ["OpenCV", "YOLOv8-nano", "Raspberry Pi 4", "Edge AI"],
    flagship: true,
  },
  {
    id: "seatbelt",
    title: "IoT Seatbelt Safety System",
    line: "Arduino-based automotive safety hardware that ties seatbelt status to vehicle behaviour.",
    tags: ["Arduino", "IoT", "Embedded"],
    flagship: true,
  },
  {
    id: "recsys",
    title: "Advanced Recommendation Systems Pipeline",
    line: "Candidate retrieval plus ranking, built with cosine similarity, matrix factorisation and neural collaborative filtering.",
    tags: ["Python", "NumPy", "Collaborative Filtering", "Neural Networks"],
    flagship: true,
  },
  { id: "urbanflow", title: "UrbanFlow AI", line: "Intelligent traffic simulation.", tags: ["Python", "Simulation", "AI"] },
  { id: "iot-traffic", title: "Smart IoT Traffic Flow System", tags: ["IoT", "Hardware"] },
  {
    id: "civil-aviation",
    title: "Civil Aviation India",
    line: "Deployed on Vercel.",
    tags: ["React", "Node.js", "Tailwind CSS", "Vercel"],
  },
  {
    id: "load-cell",
    title: "Advanced Engineering Physics: load cell experiment",
    tags: ["Sensors", "Measurement"],
  },
  { id: "flow-minds", title: "Flow Minds", line: "Hackathon work.", tags: ["Hackathon"] },
];

/* ── Telemetry ────────────────────────────────────────────── */

export const TELEMETRY_INTRO =
  "I work across the stack: React and Next.js on the surface, Three.js when something needs depth, Python for the thinking, and Arduino or a Raspberry Pi when the thing has to exist in the real world.";

export type ChannelNode = { label: string; note?: string };

export const CHANNELS: Array<{ name: string; nodes: ChannelNode[] }> = [
  {
    name: "Web",
    nodes: [
      { label: "Next.js" },
      { label: "React" },
      { label: "Tailwind CSS" },
      { label: "Three.js", note: "3D animation" },
    ],
  },
  { name: "Languages", nodes: [{ label: "Python" }, { label: "Java" }, { label: "C" }] },
  {
    name: "AI & Data",
    nodes: [
      { label: "Computer Vision", note: "OpenCV" },
      { label: "NumPy" },
      {
        label: "Recommendation Systems",
        note: "Collaborative Filtering, Cosine Similarity, Neural Networks",
      },
    ],
  },
  { name: "Hardware & IoT", nodes: [{ label: "Arduino" }, { label: "Raspberry Pi" }] },
  { name: "Design", nodes: [{ label: "Figma" }, { label: "Canva" }] },
];

/* ── Team radio ───────────────────────────────────────────── */

export const RADIO = [
  {
    channel: "CH 01",
    org: "SQUAD",
    orgDetail: "CSE Data Science club, MLRIT",
    role: "Frontend Web Developer.",
    text: "I built the club’s frontend repository and I maintain it.",
  },
  {
    channel: "CH 02",
    org: "Club Literati",
    orgDetail: "MLRIT",
    role: "Lead Designer.",
    text: "Vector layouts and promotional flyers for events including Interaction Day and Murder Mystery.",
  },
];

export const FLYERS = ["Interaction Day", "Murder Mystery", "+ more"];

/* ── Off the track ────────────────────────────────────────── */

export const OFF_TRACK_LINE =
  "The motorcycle is where I think. The games are where I lose gracefully. Both are good practice.";

/** The Off the Track stickers’ words (the sticker board and the world both read these). */
export const OFF_TRACK_FACTS = {
  ride: "Rides. Mostly Royal Enfields.",
  games: ["Valorant", "CS2", "God of War", "GTA V"],
  anime: "Jujutsu Kaisen",
  music: "On repeat: Karan Aujla",
};

/* ── Contact ──────────────────────────────────────────────── */

export const CONTACT_STATUS = "Currently: open to projects, internships and hackathon teams.";
