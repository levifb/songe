import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

/**
 * Neve muito discreta, para as telas de abertura e de vazio.
 * Poucos flocos, lentos, quase imperceptíveis — atmosfera, não decoração.
 */
export function Snowfall({ count = 18, className }: { count?: number; className?: string }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 14 + Math.random() * 12,
        delay: -Math.random() * 20,
        drift: (Math.random() - 0.5) * 60,
        opacity: 0.18 + Math.random() * 0.32,
      })),
    [count],
  )

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {flakes.map((flake) => (
        <motion.span
          key={flake.id}
          className="absolute rounded-full bg-white dark:bg-alpine-100"
          style={{
            left: `${flake.left}%`,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
          }}
          initial={{ y: '-8%' }}
          animate={{ y: '110%', x: [0, flake.drift, 0] }}
          transition={{
            y: { duration: flake.duration, delay: flake.delay, repeat: Infinity, ease: 'linear' },
            x: { duration: flake.duration / 2, delay: flake.delay, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      ))}
    </div>
  )
}
