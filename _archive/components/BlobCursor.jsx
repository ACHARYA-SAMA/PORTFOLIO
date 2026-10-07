'use client';
import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import './BlobCursor.css';

export default function BlobCursor({
  blobType = 'circle',
  fillColor = '#7B2FBE',
  trailCount = 3,
  sizes = [18, 36, 24],
  innerSizes = [5, 10, 7],
  innerColor = 'rgba(192,132,252,0.95)',
  opacities = [0.9, 0.7, 0.8],
  shadowColor = 'rgba(123,47,190,0.7)',
  shadowBlur = 12,
  shadowOffsetX = 0,
  shadowOffsetY = 0,
  filterId = 'liquid-glass-blob',
  filterStdDeviation = 6,
  filterColorMatrixValues = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -10',
  useFilter = true,
  fastDuration = 0.06,
  slowDuration = 0.25,
  fastEase = 'power3.out',
  slowEase = 'power1.out',
  zIndex = 100000
}) {
  const containerRef = useRef(null);
  const blobsRef = useRef([]);

  const handleMove = useCallback(e => {
    const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const y = 'clientY' in e ? e.clientY : e.touches[0].clientY;

    blobsRef.current.forEach((el, i) => {
      if (!el) return;
      const isLead = i === 0;
      gsap.to(el, {
        x, y,
        duration: isLead ? fastDuration : slowDuration,
        ease: isLead ? fastEase : slowEase
      });
    });
  }, [fastDuration, slowDuration, fastEase, slowEase]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [handleMove]);

  return (
    <div className="blob-container" style={{ zIndex }}>
      {useFilter && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={filterStdDeviation} />
            <feColorMatrix in="blur" values={filterColorMatrixValues} />
          </filter>
        </svg>
      )}
      <div className="blob-main" style={{ filter: useFilter ? `url(#${filterId})` : undefined }}>
        {Array.from({ length: trailCount }).map((_, i) => (
          <div
            key={i}
            ref={el => (blobsRef.current[i] = el)}
            className="blob"
            style={{
              width: sizes[i], height: sizes[i],
              borderRadius: blobType === 'circle' ? '50%' : '20%',
              backgroundColor: fillColor,
              opacity: opacities[i],
              boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
            }}
          >
            <div className="inner-dot" style={{
              width: innerSizes[i], height: innerSizes[i],
              top: (sizes[i] - innerSizes[i]) / 2,
              left: (sizes[i] - innerSizes[i]) / 2,
              backgroundColor: innerColor,
              borderRadius: blobType === 'circle' ? '50%' : '10%'
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}
