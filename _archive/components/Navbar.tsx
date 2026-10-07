"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Awards", href: "#awards" },
  { label: "Contact", href: "#contact" },
];

/* ── Weight-hover link ───────────────────────────────── */
function WeightHoverLink({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.a
      href={href}
      className="relative text-sm tracking-widest uppercase transition-all duration-300"
      style={{
        fontFamily: "var(--font-mono)",
        color: hovered ? "#C084FC" : "rgba(255,255,255,0.5)",
        fontWeight: hovered ? 700 : 200,
        /* Prevent layout shift by using fixed inline-size */
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Invisible bold text to reserve space and prevent CLS */}
      <span
        className="invisible block"
        style={{ fontWeight: 700 }}
        aria-hidden="true"
      >
        {label}
      </span>
      {/* Visible text positioned on top */}
      <span className="absolute inset-0 flex items-center justify-center">
        {label}
      </span>
    </motion.a>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-500"
      style={
        scrolled
          ? {
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(192,132,252,0.1)",
            }
          : {}
      }
    >
      {/* Monogram */}
      <a
        href="#"
        className="text-2xl font-black"
        style={{ color: "#7B2FBE", letterSpacing: "-0.02em" }}
      >
        AA
      </a>

      {/* Links with weight hover */}
      <ul className="flex gap-10">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={label}>
            <WeightHoverLink label={label} href={href} />
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}
