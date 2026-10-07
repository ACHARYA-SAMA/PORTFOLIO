"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const awards = [
  { year: "2025", name: "ZIGNASA 2K25 — Top 5 Finalist", event: "Agentic AI Track" },
  { year: "2025", name: "HackAutomate — First Prize", event: "Full Stack AI" },
  { year: "2024", name: "CodeSprint MLRIT — Best Innovation", event: "Systems Design" },
  { year: "2024", name: "MSME Idea Hackathon 6.0 — Finalist", event: "Robotics" },
  { year: "2024", name: "State Karate Championship — Gold Medalist", event: "Black Belt" },
];

export default function AwardsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      id="awards"
      style={{
        minHeight: "100vh",
        padding: "100px 80px",
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "860px" }}>
        {/* Brutalist Label */}
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={inView ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: "10px",
            letterSpacing: "0.7em",
            color: "#C084FC",
            textTransform: "uppercase",
            marginBottom: "64px",
          }}
        >
          RECOGNITION
        </motion.p>

        {/* Award Rows */}
        {awards.map((award, i) => (
          <motion.div
            key={award.name}
            initial={{ x: -20, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.6,
              delay: i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={{ x: 8 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "28px 0",
              borderBottom: "1px solid rgba(192,132,252,0.07)",
              cursor: "default",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderBottomColor = "rgba(192,132,252,0.25)";
              el.style.boxShadow = "0 0 40px rgba(123,47,190,0.1)";
              const nameEl = el.querySelector(".award-name") as HTMLElement;
              if (nameEl) nameEl.style.color = "#C084FC";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderBottomColor = "rgba(192,132,252,0.07)";
              el.style.boxShadow = "none";
              const nameEl = el.querySelector(".award-name") as HTMLElement;
              if (nameEl) nameEl.style.color = "#ffffff";
            }}
          >
            {/* Left: dot + year */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "80px" }}>
              <div
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: "#C084FC",
                  boxShadow: "0 0 8px rgba(192,132,252,0.6)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {award.year}
              </span>
            </div>

            {/* Center: Award name */}
            <span
              className="award-name"
              style={{
                fontFamily: "Geist Sans, sans-serif",
                fontSize: "clamp(16px, 2vw, 22px)",
                fontWeight: 600,
                color: "#ffffff",
                flex: 1,
                padding: "0 24px",
                transition: "color 0.3s ease",
              }}
            >
              {award.name}
            </span>

            {/* Right: event */}
            <span
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: "11px",
                color: "rgba(255,255,255,0.35)",
                textAlign: "right",
                minWidth: "140px",
              }}
            >
              {award.event}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
