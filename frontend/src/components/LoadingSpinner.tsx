import { motion } from 'framer-motion';

export function LoadingSpinner({ size = 24, color = '#fff' }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      style={{ display: 'inline-block' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="4"
          strokeDasharray="60 20"
          strokeLinecap="round"
          fill="none"
          opacity="0.25"
        />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </motion.span>
  );
}
