'use client';
import { motion } from 'framer-motion';

export default function WeightHover({ text, className }) {
  return (
    <motion.span
      className={`inline-block cursor-pointer tracking-tighter text-white ${className}`}
      initial={{ fontWeight: 200, letterSpacing: '-0.02em' }}
      whileHover={{ 
        fontWeight: 900, 
        letterSpacing: '-0.05em', 
        color: '#FF5500',
        textShadow: '0px 0px 20px rgba(255, 85, 0, 0.5)'
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ fontVariationSettings: '"wght" 200' }}
    >
      {text}
    </motion.span>
  );
}
