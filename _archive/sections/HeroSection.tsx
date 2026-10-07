"use client";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: 0.3 + i * 0.2,
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export default function HeroSection() {
  return (
    <section id="hero" className="h-[200vh] relative">
      {/* Sticky viewport — text stays while scroll drives 3D */}
      <div className="sticky top-0 h-screen flex items-center z-10 pointer-events-none">
        <div
          className="flex flex-col gap-2"
          style={{ paddingLeft: "8%", maxWidth: "60%" }}
        >
          {/* Pre-title */}
          <motion.p
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="tracking-[0.45em] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "rgba(192,132,252,0.7)",
              fontWeight: 300,
            }}
          >
            HI, I&apos;M
          </motion.p>

          {/* ARMAN — Bebas Neue display */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="leading-none"
            style={{
              fontSize: "clamp(64px, 12vw, 120px)",
              fontWeight: 400,
              fontFamily: "'Bebas Neue', sans-serif",
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            ARMAN
          </motion.h1>

          {/* ACHARYA — gradient */}
          <motion.h1
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="leading-none"
            style={{
              fontSize: "clamp(64px, 12vw, 120px)",
              fontWeight: 400,
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "-0.02em",
              background: "linear-gradient(90deg, #7B2FBE 0%, #C084FC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ACHARYA
          </motion.h1>

          {/* Role line */}
          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="uppercase mt-4"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.4em",
              color: "rgba(255,255,255,0.35)",
              fontWeight: 300,
            }}
          >
            CS&amp;D · AI · ROBOTICS · KARATE
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start gap-3 mt-16"
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.6em",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              SCROLL
            </span>
            <div
              style={{
                width: "1px",
                height: "48px",
                background: "#C084FC",
                animation: "scroll-line 2s ease-in-out infinite",
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
