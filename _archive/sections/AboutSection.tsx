"use client";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start * 100) / 100);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {typeof target === "number" && !Number.isInteger(target)
        ? count.toFixed(2)
        : Math.floor(count)}
      {suffix}
    </span>
  );
}

const skills = {
  Languages: ["Python", "JavaScript", "TypeScript", "C++"],
  Frameworks: ["React", "Next.js", "Three.js", "Node.js"],
  "AI/ML": ["YOLOv8", "TensorFlow", "OpenCV", "R3F"],
  Tools: ["Figma", "Git", "GSAP", "Framer Motion"],
};

const stats = [
  { value: 9.44, label: "CGPA", suffix: "" },
  { value: 5, label: "HACKATHONS", suffix: "+" },
  { value: 2, label: "FIRST PRIZES", suffix: "" },
  { value: 1, label: "BLACK BELT", suffix: "ST" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { y: 30, opacity: 0, filter: "blur(6px)" },
  visible: {
    y: 0, opacity: 1, filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function AboutSection() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="about"
      style={{
        minHeight: "100vh",
        padding: "120px 80px",
        display: "grid",
        gridTemplateColumns: "55fr 45fr",
        gap: "80px",
        alignItems: "start",
        background: "#000000",
      }}
    >
      {/* LEFT COLUMN */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
      >
        {/* Brutalist Label */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: "10px",
            letterSpacing: "0.7em",
            color: "#C084FC",
            textTransform: "uppercase",
            marginBottom: "64px",
          }}
        >
          ABOUT
        </motion.p>

        {/* Heading */}
        <motion.h2
          variants={itemVariants}
          style={{
            fontFamily: "Geist Sans, sans-serif",
            fontSize: "clamp(32px, 3.5vw, 46px)",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.15,
            marginBottom: "24px",
          }}
        >
          Building at the intersection
          <br />
          of AI, Design & Motion.
        </motion.h2>

        {/* Body */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: "Geist Sans, sans-serif",
            fontSize: "16px",
            lineHeight: 1.9,
            color: "rgba(255,255,255,0.5)",
            maxWidth: "480px",
            marginBottom: "48px",
          }}
        >
          I&apos;m a Computer Science &amp; Design student at MLRIT, Hyderabad.
          I build intelligent systems, immersive web experiences, and compete
          in hackathons with team Flow Minds. Black Belt in Karate. CGPA 9.44.
        </motion.p>

        {/* Stats Row — NEOMORPHISM */}
        <motion.div
          variants={containerVariants}
          style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              style={{
                flex: "1 1 100px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow:
                  "inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.03), 10px 10px 20px rgba(0,0,0,0.5)",
                borderRadius: "16px",
                padding: "24px 20px",
              }}
            >
              <div
                style={{
                  fontFamily: "Geist Sans, sans-serif",
                  fontSize: "48px",
                  fontWeight: 800,
                  color: "#C084FC",
                  lineHeight: 1,
                }}
              >
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <div
                style={{
                  fontFamily: "Geist Mono, monospace",
                  fontSize: "9px",
                  letterSpacing: "0.3em",
                  color: "rgba(255,255,255,0.35)",
                  marginTop: "12px",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* RIGHT COLUMN — CLAYMORPHISM SKILLS */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        style={{ paddingTop: "80px" }}
      >
        {Object.entries(skills).map(([category, items]) => (
          <motion.div
            key={category}
            variants={itemVariants}
            style={{ marginBottom: "32px" }}
          >
            <p
              style={{
                fontFamily: "Geist Mono, monospace",
                fontSize: "9px",
                letterSpacing: "0.4em",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              {category}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {items.map((skill) => (
                <motion.span
                  key={skill}
                  whileHover={{ scale: 1.06, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{
                    background: "rgba(123,47,190,0.12)",
                    border: "1px solid rgba(192,132,252,0.2)",
                    color: "#C084FC",
                    borderRadius: "999px",
                    padding: "5px 14px",
                    fontSize: "11px",
                    fontFamily: "Geist Mono, monospace",
                    boxShadow:
                      "0 4px 14px rgba(123,47,190,0.2), 0 1px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
                    cursor: "default",
                  }}
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
