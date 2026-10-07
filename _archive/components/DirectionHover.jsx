'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DirectionHover({ children, className }) {
  const ref = useRef(null);
  const [direction, setDirection] = useState('top');
  const [isHovered, setIsHovered] = useState(false);

  const getDirection = (ev, obj) => {
    const { width, height, left, top } = obj.getBoundingClientRect();
    const x = ev.clientX - left - (width / 2) * (width > height ? height / width : 1);
    const y = ev.clientY - top - (height / 2) * (height > width ? width / height : 1);
    const d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
    return ['top', 'right', 'bottom', 'left'][d];
  };

  const handleMouseEnter = (e) => {
    setDirection(getDirection(e, ref.current));
    setIsHovered(true);
  };

  const variants = {
    initial: (dir) => ({
      x: dir === 'left' ? '-100%' : dir === 'right' ? '100%' : 0,
      y: dir === 'top' ? '-100%' : dir === 'bottom' ? '100%' : 0,
      opacity: 0
    }),
    animate: { x: 0, y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
    exit: (dir) => ({
      x: dir === 'left' ? '-100%' : dir === 'right' ? '100%' : 0,
      y: dir === 'top' ? '-100%' : dir === 'bottom' ? '100%' : 0,
      opacity: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
    })
  };

  return (
    <div 
      ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-3xl shadow-[inset_2px_2px_10px_rgba(255,255,255,0.05),_0_20px_40px_rgba(0,0,0,0.8)] ${className}`}
    >
      <AnimatePresence custom={direction}>
        {isHovered && (
          <motion.div
            custom={direction} variants={variants} initial="initial" animate="animate" exit="exit"
            className="absolute inset-0 z-0 bg-gradient-to-br from-[#FF5500]/30 to-transparent pointer-events-none mix-blend-screen"
          />
        )}
      </AnimatePresence>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
