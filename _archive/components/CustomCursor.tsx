"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      gsap.to(dot, {
        x: mouseX,
        y: mouseY,
        duration: 0.08,
        ease: "power2.out",
      });
    };

    const onMouseDown = () => {
      document.body.classList.add("cursor-click");
      gsap.to(dot, { scale: 0.5, duration: 0.1 });
      gsap.to(ring, { scale: 0.8, duration: 0.1 });
    };

    const onMouseUp = () => {
      document.body.classList.remove("cursor-click");
      gsap.to(dot, { scale: 1, duration: 0.2 });
      gsap.to(ring, { scale: 1, duration: 0.2 });
    };

    const onMouseEnterLink = () => {
      document.body.classList.add("cursor-hover");
      gsap.to(ring, {
        width: 48,
        height: 48,
        backgroundColor: "rgba(123,47,190,0.15)",
        borderColor: "#C084FC",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const onMouseLeaveLink = () => {
      document.body.classList.remove("cursor-hover");
      gsap.to(ring, {
        width: 28,
        height: 28,
        backgroundColor: "transparent",
        borderColor: "rgba(192,132,252,0.4)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    const interactives = document.querySelectorAll(
      "a, button, [data-magnet], [data-cursor]"
    );
    interactives.forEach((el) => {
      el.addEventListener("mouseenter", onMouseEnterLink);
      el.addEventListener("mouseleave", onMouseLeaveLink);
    });

    // Ring lag loop
    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.07;
      ringY += (mouseY - ringY) * 0.07;
      gsap.set(ring, { x: ringX, y: ringY });
      requestAnimationFrame(animateRing);
    };
    animateRing();

    // Magnetism
    const magnets = document.querySelectorAll("[data-magnet]");
    magnets.forEach((magnet) => {
      magnet.addEventListener("mousemove", (e: Event) => {
        const mouseEvent = e as MouseEvent;
        const rect = (magnet as HTMLElement).getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left - rect.width / 2;
        const y = mouseEvent.clientY - rect.top - rect.height / 2;
        gsap.to(magnet, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.4,
          ease: "power2.out",
        });
      });
      magnet.addEventListener("mouseleave", () => {
        gsap.to(magnet, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.5)",
        });
      });
    });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <>
      {/* Inner dot */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#C084FC",
          pointerEvents: "none",
          zIndex: 100001,
          transform: "translate(-50%, -50%)",
          mixBlendMode: "difference",
        }}
      />
      {/* Outer ring */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "1px solid rgba(192,132,252,0.4)",
          pointerEvents: "none",
          zIndex: 100001,
          transform: "translate(-50%, -50%)",
          backgroundColor: "transparent",
          transition: "width 0.3s, height 0.3s, background-color 0.3s",
        }}
      />
    </>
  );
}
