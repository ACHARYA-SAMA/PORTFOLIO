'use client';

import { useRef, useCallback } from 'react';

const achievements = [
  {
    icon: '🥋',
    title: 'Karate Black Belt',
    sub: 'Martial Arts',
    detail:
      'Dedicated practitioner of traditional karate, achieving the highest belt rank through years of disciplined training.',
  },
  {
    icon: '🥇',
    title: '5× State Level Gold',
    sub: 'Competition',
    detail:
      'Five consecutive state-level gold medals across regional and national qualifier tournaments.',
  },
  {
    icon: '🥈',
    title: '3× State Level Silver',
    sub: 'Competition',
    detail:
      'Three silver medals at state-level tournaments, demonstrating consistent top-tier performance.',
  },
  {
    icon: '🏆',
    title: 'National Level Gold',
    sub: 'Championship',
    detail:
      'Gold medal at the national level championship — the pinnacle achievement in competitive karate.',
  },
];

export default function FaceReveal() {
  const maskRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!maskRef.current || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const gradient = `radial-gradient(circle 380px at ${x}px ${y}px, transparent 0%, black 100%)`;
      maskRef.current.style.webkitMaskImage = gradient;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (maskRef.current.style as any).maskImage = gradient;
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    if (!maskRef.current) return;
    const reset =
      'radial-gradient(circle 0px at 50% 50%, transparent 0%, black 100%)';
    maskRef.current.style.webkitMaskImage = reset;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (maskRef.current.style as any).maskImage = reset;
  }, []);

  return (
    <section className="bg-[#030303] py-24 px-6 md:px-12 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[140px]"
        style={{ background: 'rgba(139,92,246,0.07)' }}
      />

      {/* ── Header ── */}
      <p className="text-xs uppercase tracking-[0.35em] text-purple-500 mb-4 font-medium">
        // IDENTITY MATRIX
      </p>
      <h2
        className="font-black tracking-tight leading-none mb-6"
        style={{
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          background: 'linear-gradient(135deg, #e0d7ff 0%, #a855f7 50%, #7c3aed 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        THE ARCHITECT
      </h2>
      <p className="max-w-xl text-gray-400 leading-relaxed mb-14" style={{ fontSize: '1.05rem' }}>
        Arman Acharya — CS&amp;D student, UI/UX designer, full-stack developer,
        and systems thinker. I design and build experiences at the intersection
        of intelligence, craft, and precision.
      </p>

      {/* ── Portrait card ── */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-[#0a0a0a] cursor-crosshair"
        style={{
          aspectRatio: '3/4',
          border: '1px solid rgba(168,85,247,0.3)',
          boxShadow: '0 0 100px rgba(168,85,247,0.15)',
        }}
      >
        {/* Bottom layer — base image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/face-base.png"
          alt="Arman Acharya"
          className="absolute inset-0 w-full h-full object-cover object-top select-none pointer-events-none"
          draggable={false}
        />

        {/* Top layer — revealed on hover */}
        <div
          ref={maskRef}
          aria-hidden="true"
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/mask-top.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 5%',
            WebkitMaskImage:
              'radial-gradient(circle 0px at 50% 50%, transparent 0%, black 100%)',
            maskImage:
              'radial-gradient(circle 0px at 50% 50%, transparent 0%, black 100%)',
            transition: '-webkit-mask-image 0.12s ease, mask-image 0.12s ease',
          }}
        />

        {/* Hint badge */}
        <p
          aria-hidden="true"
          className="absolute bottom-6 right-8 text-white/40 tracking-widest text-xs uppercase z-[25] pointer-events-none select-none"
        >
          HOVER TO UNMASK
        </p>
      </div>

      {/* ── Achievement grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-16 max-w-4xl mx-auto">
        {achievements.map((a) => (
          <div
            key={a.title}
            className="group bg-white/[0.03] rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/50"
            style={{ border: '1px solid rgba(168,85,247,0.2)' }}
          >
            <div className="text-[1.75rem] mb-3" aria-hidden="true">
              {a.icon}
            </div>
            <p
              className="text-sm font-bold mb-1 tracking-wide"
              style={{ color: '#e0d7ff' }}
            >
              {a.title}
            </p>
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: '#7c3aed' }}
            >
              {a.sub}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">{a.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

