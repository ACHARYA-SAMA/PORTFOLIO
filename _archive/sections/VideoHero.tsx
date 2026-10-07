"use client";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

export default function VideoHero() {
  return (
    <section
      id="video-hero"
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Background Video */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease }}
        viewport={{ once: true }}
        className="absolute inset-0 z-0 flex items-center justify-center"
      >
        {/* Mobile: 80% centered, Desktop: full cover */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="video-hero-player"
          style={{ objectFit: "cover", opacity: 0.6 }}
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
            type="video/mp4"
          />
        </video>
        <style jsx>{`
          .video-hero-player {
            width: 80%;
            height: 80%;
            border-radius: 12px;
          }
          @media (min-width: 768px) {
            .video-hero-player {
              width: 100%;
              height: 100%;
              border-radius: 0;
            }
          }
        `}</style>
      </motion.div>

      {/* Overlay gradient */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Footer content pinned to bottom */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, ease }}
        viewport={{ once: true }}
        className="absolute bottom-0 left-0 right-0 z-30"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)",
          padding: "48px 32px",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          {/* Left block */}
          <div className="flex flex-col gap-4">
            {/* Subtitle */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease }}
              viewport={{ once: true }}
              className="flex items-center gap-2"
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#C084FC",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  opacity: 0.55,
                  letterSpacing: "0.1em",
                  color: "#fff",
                }}
              >
                CS&amp;D · AI · Robotics — Hyderabad, India
              </span>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease }}
              viewport={{ once: true }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                  fontWeight: 300,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: "#fff",
                }}
              >
                One Vision, Zero
                <br />
                Limits. Worldwide.
              </h2>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.0, ease }}
              viewport={{ once: true }}
              className="flex gap-3 mt-4"
            >
              <motion.a
                href="#projects"
                data-magnet
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  background: "#ffffff",
                  color: "#000",
                  borderRadius: "999px",
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "var(--font-sans)",
                  textDecoration: "none",
                }}
              >
                See Projects
              </motion.a>
              <motion.a
                href="#about"
                data-magnet
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.35)",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "var(--font-sans)",
                  textDecoration: "none",
                }}
              >
                My Story
              </motion.a>
            </motion.div>
          </div>

          {/* Right block — tag pills (desktop) */}
          <div className="hidden md:flex gap-2">
            {["Neuromorphic", "Agentic AI", "Robotics"].map((tag) => (
              <span
                key={tag}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "999px",
                  padding: "6px 16px",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
