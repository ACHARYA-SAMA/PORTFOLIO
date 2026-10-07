"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import "./BlobCursor.css";

interface BlobCursorProps {
  blobType?: "circle" | "square";
  fillColor?: string;
  trailCount?: number;
  sizes?: number[];
  innerSizes?: number[];
  innerColor?: string;
  opacities?: number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  filterId?: string;
  filterStdDeviation?: number;
  filterColorMatrixValues?: string;
  useFilter?: boolean;
  fastDuration?: number;
  slowDuration?: number;
  fastEase?: string;
  slowEase?: string;
  zIndex?: number;
}

export default function BlobCursor({
  blobType = "circle",
  fillColor = "#7B2FBE",
  trailCount = 3,
  sizes = [60, 125, 75],
  innerSizes = [20, 35, 25],
  innerColor = "rgba(192,132,252,0.8)",
  opacities = [0.6, 0.6, 0.6],
  shadowColor = "rgba(123,47,190,0.5)",
  shadowBlur = 25,
  shadowOffsetX = 0,
  shadowOffsetY = 0,
  filterId = "blob",
  filterStdDeviation = 30,
  filterColorMatrixValues = "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 35 -10",
  useFilter = true,
  fastDuration = 0.1,
  slowDuration = 0.5,
  fastEase = "power3.out",
  slowEase = "power1.out",
  zIndex = 100,
}: BlobCursorProps) {
  const blobsRef = useRef<(HTMLDivElement | null)[]>([]);

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const x = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const y = "clientY" in e ? e.clientY : e.touches[0].clientY;

      blobsRef.current.forEach((el, i) => {
        if (!el) return;
        const isLead = i === 0;
        gsap.to(el, {
          x,
          y,
          duration: isLead ? fastDuration : slowDuration,
          ease: isLead ? fastEase : slowEase,
        });
      });
    },
    [fastDuration, slowDuration, fastEase, slowEase]
  );

  useEffect(() => {
    blobsRef.current.forEach((el) => {
      if (el) gsap.set(el, { xPercent: -50, yPercent: -50 });
    });

    window.addEventListener("mousemove", handleMove as EventListener);
    window.addEventListener("touchmove", handleMove as EventListener);
    return () => {
      window.removeEventListener("mousemove", handleMove as EventListener);
      window.removeEventListener("touchmove", handleMove as EventListener);
    };
  }, [handleMove]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: zIndex,
        overflow: "hidden",
      }}
    >
      {useFilter && (
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <defs>
            <filter id={filterId}>
              <feGaussianBlur
                in="SourceGraphic"
                result="blur"
                stdDeviation={filterStdDeviation}
              />
              <feColorMatrix in="blur" values={filterColorMatrixValues} />
            </filter>
          </defs>
        </svg>
      )}

      <div
        className="blob-main"
        style={{ filter: useFilter ? `url(#${filterId})` : undefined }}
      >
        {Array.from({ length: trailCount }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              blobsRef.current[i] = el;
            }}
            className="blob"
            style={{
              width: sizes[i],
              height: sizes[i],
              borderRadius: blobType === "circle" ? "50%" : "0%",
              backgroundColor: fillColor,
              opacity: opacities[i],
              boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px 0 ${shadowColor}`,
            }}
          >
            <div
              className="inner-dot"
              style={{
                width: innerSizes[i],
                height: innerSizes[i],
                top: (sizes[i] - innerSizes[i]) / 2,
                left: (sizes[i] - innerSizes[i]) / 2,
                backgroundColor: innerColor,
                borderRadius: blobType === "circle" ? "50%" : "0%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
