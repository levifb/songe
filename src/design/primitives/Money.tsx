import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { cn } from '@/lib/cn'
import { formatCents, formatCentsCompact, type Cents } from '@/lib/money'

interface MoneyProps {
  cents: Cents
  className?: string
  /** Esconde os centavos quando são zero — para títulos grandes. */
  compact?: boolean
  /** Anima do valor anterior até o novo. O aporte precisa ser visto acontecendo. */
  animated?: boolean
  duration?: number
}

export function Money({ cents, className, compact = true, animated = false, duration = 1.1 }: MoneyProps) {
  const format = compact ? formatCentsCompact : formatCents
  const [display, setDisplay] = useState(() => format(cents))
  const previous = useRef(cents)

  useEffect(() => {
    if (!animated) {
      setDisplay(format(cents))
      previous.current = cents
      return
    }

    const from = previous.current
    previous.current = cents
    if (from === cents) return

    const controls = animate(from, cents, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => setDisplay(format(Math.round(value))),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents, animated, duration, compact])

  return (
    <span className={cn('numeric', className)}>{display}</span>
  )
}
