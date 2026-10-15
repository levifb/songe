import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface ProgressSegment {
  id: string
  /** Fração de 0..1 do total da meta que esta pessoa preencheu. */
  ratio: number
  tone: 'mine' | 'hers'
}

interface ProgressBarProps {
  segments: ProgressSegment[]
  className?: string
  height?: 'thin' | 'regular' | 'thick'
  /** Sobre foto, a trilha precisa ser clara em vez de escura. */
  onPhoto?: boolean
  label?: string
}

const heights = { thin: 'h-1.5', regular: 'h-2.5', thick: 'h-3.5' }
const tones = { mine: 'bg-mine', hers: 'bg-hers' }

export function ProgressBar({ segments, className, height = 'regular', onPhoto = false, label }: ProgressBarProps) {
  const total = segments.reduce((acc, s) => acc + s.ratio, 0)

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-full',
        heights[height],
        onPhoto ? 'bg-white/25 backdrop-blur-[2px]' : 'bg-ground-2 dark:bg-alpine-800',
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(total, 1) * 100)}
      aria-label={label}
    >
      <div className="absolute inset-0 flex">
        {segments.map((segment, index) => (
          <motion.div
            key={segment.id}
            className={cn(
              tones[segment.tone],
              /* Só a última ponta arredonda — as costuras internas ficam retas. */
              index === segments.length - 1 && 'rounded-r-full',
              index === 0 && 'rounded-l-full',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(segment.ratio, 1) * 100}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 20, delay: 0.12 + index * 0.08 }}
          />
        ))}
      </div>
    </div>
  )
}
