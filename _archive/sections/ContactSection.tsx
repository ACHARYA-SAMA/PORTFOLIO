"use client";
import { motion } from "framer-motion";

export default function ContactSection() {
  return (
    <section
      id="contact"
      style={{
        minHeight: "100vh",
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 40px",
        textAlign: "center",
      }}
    >
      {/* Brutalist label */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: "Geist Mono, monospace",
          fontSize: "10px",
          letterSpacing: "0.7em",
          color: "#C084FC",
          textTransform: "uppercase",
          marginBottom: "32px",
        }}
      >
        GET IN TOUCH
      </motion.p>

      {/* Heading */}
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: "Geist Sans, sans-serif",
          fontSize: "clamp(48px, 10vw, 96px)",
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1,
          margin: 0,
        }}
      >
        LET&apos;S BUILD
      </motion.h2>

      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: "Geist Sans, sans-serif",
          fontSize: "clamp(48px, 10vw, 96px)",
          fontWeight: 900,
          background: "linear-gradient(90deg, #7B2FBE, #C084FC)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          margin: "0 0 24px 0",
        }}
      >
        SOMETHING.
      </motion.h2>

      {/* Subtext */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: "Geist Sans, sans-serif",
          fontSize: "16px",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.05em",
          marginBottom: "48px",
        }}
      >
        Open to collaborations, internships, and hackathons.
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}
      >
        <motion.a
          href="https://github.com/arman-acharya"
          target="_blank"
          rel="noopener noreferrer"
          data-magnet
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            border: "1px solid rgba(192,132,252,0.35)",
            background: "transparent",
            color: "#ffffff",
            padding: "14px 36px",
            borderRadius: "999px",
            fontSize: "14px",
            fontFamily: "Geist Sans, sans-serif",
            textDecoration: "none",
            display: "inline-block",
            cursor: "none",
          }}
        >
          View GitHub
        </motion.a>

        <motion.a
          href="https://linkedin.com/in/arman-acharya"
          target="_blank"
          rel="noopener noreferrer"
          data-magnet
          whileHover={{ scale: 1.04, boxShadow: "0 0 50px rgba(123,47,190,0.7)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            background: "linear-gradient(135deg, #7B2FBE, #9333EA)",
            color: "#ffffff",
            padding: "14px 36px",
            borderRadius: "999px",
            fontSize: "14px",
            fontFamily: "Geist Sans, sans-serif",
            textDecoration: "none",
            display: "inline-block",
            cursor: "none",
            boxShadow: "0 0 30px rgba(123,47,190,0.45)",
          }}
        >
          Connect on LinkedIn
        </motion.a>
      </motion.div>

      {/* Email */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{
          fontFamily: "Geist Mono, monospace",
          fontSize: "12px",
          color: "rgba(255,255,255,0.25)",
          marginTop: "40px",
          cursor: "none",
        }}
      >
        25r21a6704@mlrit.ac.in
      </motion.p>
    </section>
  );
}
