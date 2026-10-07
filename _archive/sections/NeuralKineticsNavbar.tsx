"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function NeuralKineticsNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        className="transition-all duration-500"
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: scrolled ? "12px 24px" : "20px 24px",
          ...(scrolled
            ? {
                background: "rgba(0,0,0,0.85)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(192,132,252,0.1)",
              }
            : {}),
        }}
      >
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3">
          {/* Logo + Brand */}
          <a href="#" className="flex items-center gap-2" data-magnet>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect
                x="4"
                y="10"
                width="20"
                height="8"
                rx="4"
                fill="white"
                transform="rotate(-35 14 14)"
              />
              <rect
                x="4"
                y="10"
                width="20"
                height="8"
                rx="4"
                fill="rgba(255,255,255,0.4)"
                transform="rotate(-35 14 14) translate(0, 6)"
              />
            </svg>
            <span
              className="hidden md:block"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#fff",
              }}
            >
              Arman Acharya
            </span>
          </a>

          {/* Menu Pill */}
          <motion.button
            data-magnet
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-2"
            style={{
              background: "#000",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "999px",
              padding: "6px 12px",
            }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#fff",
              }}
            >
              <Plus size={12} strokeWidth={3} color="#000" />
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#fff",
                fontWeight: 400,
                fontFamily: "var(--font-sans)",
              }}
            >
              Menu
            </span>
          </motion.button>

          {/* Tags Pill — desktop only */}
          <div
            className="hidden md:flex items-center gap-2"
            style={{
              background: "#F4F4F6",
              borderRadius: "999px",
              padding: "6px 14px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#333",
                fontFamily: "var(--font-sans)",
              }}
            >
              Flow Minds
            </span>
            <span
              style={{
                width: 1,
                height: 14,
                background: "rgba(0,0,0,0.15)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: "#333",
                fontFamily: "var(--font-sans)",
              }}
            >
              MLRIT
            </span>
          </div>
        </div>

        {/* RIGHT SIDE — desktop only */}
        <div
          className="hidden md:flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "999px",
            padding: "6px 14px",
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#000",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="3" cy="3" r="1.5" fill="white" />
              <circle cx="9" cy="3" r="1.5" fill="white" />
              <circle cx="3" cy="9" r="1.5" fill="white" />
              <circle cx="9" cy="9" r="1.5" fill="white" />
            </svg>
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Adaptive Systems
          </span>
        </div>
      </div>
    </motion.nav>
  );
}
