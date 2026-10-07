'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 158;
const FRAME_DIR =
  '/Untitled_Scene_08-21_05_11_36_202608211107__1__frames';

/** Zero-pad index to 3 digits: 1 → "001" */
const framePath = (i: number) =>
  `${FRAME_DIR}/frame_${String(i).padStart(3, '0')}.png`;

export default function CanvasShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Holds every decoded Image object after preload
  const framesRef = useRef<HTMLImageElement[]>([]);
  // Current frame index (1-based to match filenames)
  const currentFrameRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── helpers ────────────────────────────────────────────────────────────

    /** Resize canvas to fill its parent, redraw current frame. */
    const syncSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      renderFrame(currentFrameRef.current);
    };

    /**
     * Draw a frame using object-fit:cover logic so the image always fills
     * the canvas without distortion regardless of aspect ratio.
     */
    const renderFrame = (index: number) => {
      const img = framesRef.current[index - 1]; // frames array is 0-based
      if (!img || !img.complete || !img.naturalWidth) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // Scale so the image covers the canvas (cover logic)
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    // ── preload ────────────────────────────────────────────────────────────

    let loadedCount = 0;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    const onFirstFrameReady = () => {
      // Render frame 1 as soon as it is decoded so the canvas isn't blank
      syncSize();
    };

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        loadedCount++;
        if (i === 1) onFirstFrameReady();
      };
      images[i - 1] = img;
    }

    framesRef.current = images;

    // Initial canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // ── GSAP scroll sequence ───────────────────────────────────────────────

    // Proxy object GSAP will tween; avoids touching React state
    const proxy = { frame: 1 };

    const tween = gsap.to(proxy, {
      frame: TOTAL_FRAMES,
      ease: 'none', // linear — ScrollTrigger scrub handles easing
      onUpdate() {
        const index = Math.round(proxy.frame);
        currentFrameRef.current = index;
        renderFrame(index);
      },
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=300%',
        pin: true,
        scrub: 0.5,
      },
    });

    // ── resize ─────────────────────────────────────────────────────────────

    const resizeObserver = new ResizeObserver(() => {
      syncSize();
    });
    resizeObserver.observe(canvas);

    window.addEventListener('resize', syncSize);

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach((st) => st.kill());
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncSize);
    };
  }, []);

  return (
    // Outer wrapper — GSAP pins this element to the viewport
    <div ref={containerRef} className="relative h-screen w-full bg-[#030303]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {/* Dark luxury overlay — tints without touching canvas pixels */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />

      {/* Text overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="text-center px-6">
          <p className="text-sm md:text-base uppercase tracking-[0.35em] text-violet-400 mb-4 font-light">
            Scroll to explore
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-violet-400 via-purple-300 to-violet-500 bg-clip-text text-transparent drop-shadow-lg">
            MacBook Showcase
          </h2>
        </div>
      </div>
    </div>
  );
}
