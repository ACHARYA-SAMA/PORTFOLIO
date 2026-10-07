'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollVideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Step 1: Mark metadata as ready and trigger a GSAP layout refresh
  const handleLoadedMetadata = () => {
    setIsLoaded(true);
    // Let GSAP recalculate pinned section dimensions now that
    // the video element has known intrinsic dimensions and duration
    ScrollTrigger.refresh();
  };

  // Step 2: Create the ScrollTrigger only after metadata is confirmed
  useEffect(() => {
    if (!isLoaded) return;

    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) return;
    if (!video.duration || isNaN(video.duration) || !isFinite(video.duration)) return;

    const duration = video.duration;

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: 1,
      onUpdate: (self) => {
        // Direct seek — safe now because metadata is guaranteed loaded.
        // GSAP's scrub easing already smooths rapid scroll input, so
        // a rAF loop would only add redundant 60fps overhead.
        video.currentTime = self.progress * duration;
      },
    });

    return () => {
      st.kill();
    };
  }, [isLoaded]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Video — preload="auto" buffers the full file so seeks never stall */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full object-cover"
      >
        <source src="/macbook-showcase.mp4" type="video/mp4" />
      </video>

      {/* Dark luxury overlay */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Centred text overlay */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="text-center px-6">
          <p className="text-base md:text-lg uppercase tracking-[0.3em] text-violet-400 mb-4 font-light">
            Scroll to explore
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-violet-400 via-purple-300 to-violet-500 bg-clip-text text-transparent">
            MacBook Showcase
          </h2>
        </div>
      </div>

      {/* Loading state — hidden once metadata arrives */}
      {!isLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </section>
  );
}
