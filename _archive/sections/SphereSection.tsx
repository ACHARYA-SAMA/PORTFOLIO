"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function SphereSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40%" });

  return (
    <section
      id="sphere"
      ref={ref}
      className="h-[150vh] relative z-10 flex items-center justify-center"
    >
      <div className="sticky top-0 h-screen flex items-center justify-center pointer-events-none">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="text-2xl tracking-[0.2em] text-white text-center"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Every project is a universe.
        </motion.p>
      </div>
    </section>
  );
}
