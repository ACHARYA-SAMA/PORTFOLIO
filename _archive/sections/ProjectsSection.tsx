"use client";
import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/components/three/ProjectGlobe";

/* ── Projects data ────────────────────────────────────── */
const PROJECTS = [
  {
    num: "01",
    title: "UrbanFlow AI",
    desc: "Intelligent traffic simulation with AI-driven green-light allocation. Real-time urban mobility optimization at scale.",
    tags: ["React", "Python ML", "Three.js", "Node.js"],
    github: "https://github.com/arman-acharya/urbanflow-ai",
  },
  {
    num: "02",
    title: "Micro-Sort SCARA Cobot",
    desc: "Tabletop sorting robot for Indian MSMEs using YOLOv8-nano on Raspberry Pi 4. Space-efficient industrial automation.",
    tags: ["YOLOv8", "Raspberry Pi", "PCA9685", "Computer Vision"],
    github: "https://github.com/arman-acharya/microsort-scara",
  },
  {
    num: "03",
    title: "Smart IoT Traffic System",
    desc: "Real-time congestion detection and adaptive signal control using distributed IoT sensor networks.",
    tags: ["IoT", "Node.js", "Computer Vision", "MQTT"],
    github: "https://github.com/arman-acharya/smart-iot-traffic",
  },
  {
    num: "04",
    title: "Civil Aviation India",
    desc: "Flight trajectory visualization with real-time altitude and speed monitoring. Geospatial data integration.",
    tags: ["React", "Three.js", "Geospatial", "Data Visualization"],
    github: "https://github.com/arman-acharya/civil-aviation-india",
  },
  {
    num: "05",
    title: "Flow Minds Hackathon",
    desc: "Competitive hackathon builds — ZIGNASA 2K25 Top 5, HackAutomate 2025 First Prize, CodeSprint MLRIT 2024.",
    tags: ["AI", "Agentic Systems", "Full Stack", "Rapid Prototyping"],
    github: "https://github.com/arman-acharya",
  },
];

/* ── GitHub icon ──────────────────────────────────────── */
function GitHubIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ── External link icon ───────────────────────────────── */
function ExternalIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
      />
    </svg>
  );
}

/* ── Direction-aware hover overlay ─────────────────────── */
type Direction = "top" | "right" | "bottom" | "left";

function DirectionHoverCard({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const getDirection = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return "top" as Direction;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const angle = Math.atan2(y, x) * (180 / Math.PI) + 180;
      if (angle >= 45 && angle < 135) return "top";
      if (angle >= 135 && angle < 225) return "right";
      if (angle >= 225 && angle < 315) return "bottom";
      return "left";
    },
    []
  );

  const overlayVariants = {
    top: { y: "-100%" },
    right: { x: "100%" },
    bottom: { y: "100%" },
    left: { x: "-100%" },
    center: { x: 0, y: 0 },
  };

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={(e) => {
        setDirection(getDirection(e));
        setIsHovering(true);
      }}
      onMouseLeave={(e) => {
        setDirection(getDirection(e));
        setIsHovering(false);
      }}
    >
      {/* Direction overlay */}
      <AnimatePresence>
        {isHovering && direction && (
          <motion.div
            className="absolute inset-0 z-0 rounded-2xl"
            style={{ background: "rgba(192,132,252,0.05)" }}
            initial={overlayVariants[direction]}
            animate={overlayVariants.center}
            exit={overlayVariants[direction]}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ── Claymorphism tag pill ─────────────────────────────── */
function ClayTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "rgba(123,47,190,0.18)",
        border: "1px solid rgba(192,132,252,0.25)",
        color: "#C084FC",
        borderRadius: "999px",
        padding: "4px 14px",
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        boxShadow: "0 3px 10px rgba(123,47,190,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </span>
  );
}

/* ── Main component ────────────────────────────────────── */
export default function ProjectsSection() {
  const { activeProject, setActive } = useProjectStore();
  const project = activeProject !== null ? PROJECTS[activeProject] : null;

  return (
    <section id="projects" className="h-[200vh] relative z-10">
      <div className="sticky top-0 h-screen flex items-center">
        {/* Left: heading + navigation dots */}
        <div className="pl-16 flex flex-col gap-6 pointer-events-none max-w-md">
          {/* Brutalist label */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.6em",
              color: "#C084FC",
              textTransform: "uppercase",
            }}
          >
            WORK
          </p>

          <h2
            className="leading-tight"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "48px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Click a
            <br />
            <span style={{ color: "#C084FC" }}>pin</span> to explore.
          </h2>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {PROJECTS.length} selected works
          </p>

          {/* Navigation dots — vertical */}
          <div className="flex flex-col gap-3 mt-4 pointer-events-auto">
            {PROJECTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setActive(activeProject === i ? null : i)}
                className="flex items-center gap-3 group text-left transition-all duration-300"
              >
                <span
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: activeProject === i ? "8px" : "6px",
                    height: activeProject === i ? "8px" : "6px",
                    background:
                      activeProject === i
                        ? "#C084FC"
                        : "rgba(255,255,255,0.2)",
                    boxShadow:
                      activeProject === i
                        ? "0 0 12px rgba(192,132,252,0.6)"
                        : "none",
                  }}
                />
                <span
                  className="text-xs tracking-wider transition-all duration-300"
                  style={{
                    color:
                      activeProject === i
                        ? "#C084FC"
                        : "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: activeProject === i ? 600 : 300,
                  }}
                >
                  {p.num} — {p.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: project card with direction-aware hover */}
        <AnimatePresence mode="wait">
          {project && (
            <motion.div
              key={activeProject}
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 35,
              }}
              className="fixed md:absolute right-0 md:right-16 top-1/2 -translate-y-1/2 z-50"
              style={{ width: "420px", maxWidth: "90vw" }}
            >
              <DirectionHoverCard>
                <div
                  className="flex flex-col gap-5"
                  style={{
                    background: "rgba(123,47,190,0.08)",
                    border: "1px solid rgba(192,132,252,0.15)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    borderRadius: "24px",
                    padding: "40px",
                    position: "relative",
                  }}
                >
                  {/* Close button — hover rotates 90deg */}
                  <motion.button
                    onClick={() => setActive(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    aria-label="Close project card"
                  >
                    ✕
                  </motion.button>

                  {/* Project number — large watermark */}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "64px",
                      fontWeight: 900,
                      color: "rgba(192,132,252,0.2)",
                      lineHeight: 1,
                    }}
                  >
                    {project.num}
                  </span>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      lineHeight: 1.8,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {project.desc}
                  </p>

                  {/* Tech tags — claymorphism */}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <ClayTag key={tag}>{tag}</ClayTag>
                    ))}
                  </div>

                  {/* Links */}
                  <div className="flex items-center gap-4 mt-2">
                    <motion.a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-magnet
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-300"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#C084FC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                      }}
                    >
                      <GitHubIcon />
                      GitHub
                    </motion.a>
                    <motion.a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-magnet
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-300"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#C084FC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                      }}
                    >
                      <ExternalIcon />
                      Live
                    </motion.a>
                  </div>
                </div>
              </DirectionHoverCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
