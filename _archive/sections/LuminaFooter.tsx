"use client";
import { motion } from "framer-motion";
import { Music2 } from "lucide-react";

const Facebook = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const Twitter = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const Youtube = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2.5 7.1C2.1 8.4 2 10.2 2 12s.1 3.6.5 4.9c.7 2.6 2.7 3.5 9.5 3.5s8.8-.9 9.5-3.5c.4-1.3.5-3.1.5-4.9s-.1-3.6-.5-4.9C20.8 4.5 18.8 3.6 12 3.6S3.2 4.5 2.5 7.1z"/><path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z"/></svg>
);
const Instagram = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const footerLinks = {
  EXPLORE: ["Projects", "Awards", "About Me", "GitHub", "Resume"],
  CONNECT: ["LinkedIn", "Email Me", "Team Flow Minds", "MLRIT Profile", "Hackathon History"],
  LEGAL: ["Privacy", "Terms", "Colophon", "Accessibility", "Report Issue"],
};

const socialIcons = [
  { Icon: Music2, href: "#" },
  { Icon: Facebook, href: "#" },
  { Icon: Twitter, href: "#" },
  { Icon: Youtube, href: "#" },
  { Icon: Instagram, href: "#" },
];

export default function LuminaFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
      className="liquid-glass w-full rounded-3xl p-6 md:p-10 text-white/70 mt-32 md:mt-64"
    >
      {/* Top Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "40px 48px",
          marginBottom: "40px",
        }}
      >
        {/* Brand Column */}
        <div style={{ gridColumn: "span 5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              fill="currentColor"
            >
              <path d="M 4.688 136 C 68.373 136 120 187.627 120 251.312 C 120 252.883 119.967 254.445 119.905 256 L 0 256 L 0 136.096 C 1.555 136.034 3.117 136 4.688 136 Z M 251.312 136 C 252.883 136 254.445 136.034 256 136.096 L 256 256 L 136.095 256 C 136.032 254.438 136.001 252.875 136 251.312 C 136 187.627 187.627 136 251.312 136 Z M 119.905 0 C 119.967 1.555 120 3.117 120 4.688 C 120 68.373 68.373 120 4.687 120 C 3.117 120 1.555 119.967 0 119.905 L 0 0 Z M 256 119.905 C 254.445 119.967 252.883 120 251.312 120 C 187.627 120 136 68.373 136 4.687 C 136 3.117 136.033 1.555 136.095 0 L 256 0 Z" />
            </svg>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 500,
                color: "#ffffff",
                fontFamily: "Geist Sans, sans-serif",
              }}
            >
              ARMAN ACHARYA
            </span>
          </div>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              maxWidth: "360px",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "Geist Sans, sans-serif",
            }}
          >
            Building intelligent systems, immersive 3D web experiences, and
            competing in hackathons from Hyderabad, India.
          </p>
        </div>

        {/* Links Columns */}
        <div
          style={{
            gridColumn: "span 7",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "32px",
          }}
        >
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#ffffff",
                  fontWeight: 500,
                  marginBottom: "16px",
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                {category}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    data-magnet
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.5)",
                      textDecoration: "none",
                      fontFamily: "Geist Sans, sans-serif",
                      transition: "color 0.2s ease",
                      cursor: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)";
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          paddingTop: "24px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            opacity: 0.5,
            fontFamily: "Geist Mono, monospace",
          }}
        >
          Built by @ArmanAcharya · MLRIT · Team Flow Minds
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.5,
              fontFamily: "Geist Mono, monospace",
            }}
          >
            Find me on:
          </span>
          <div style={{ display: "flex", gap: "16px" }}>
            {socialIcons.map(({ Icon, href }, i) => (
              <motion.a
                key={i}
                href={href}
                data-magnet
                whileHover={{ scale: 1.15, color: "#ffffff" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{
                  color: "rgba(255,255,255,0.7)",
                  cursor: "none",
                  display: "flex",
                }}
              >
                <Icon size={16} />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
