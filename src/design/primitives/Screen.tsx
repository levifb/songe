import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fade, riseIn, spring, stagger } from '@/design/motion'

/** Respiro lateral padrão. Uma medida só, para todas as telas. */
export const GUTTER = 'px-5'

interface ScreenProps {
  children: ReactNode
  className?: string
  /** Telas com foto sangrando no topo dispensam o respiro superior. */
  bleed?: boolean
}

export function Screen({ children, className, bleed = false }: ScreenProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger()}
      className={cn(bleed ? '' : 'pt-[max(1rem,env(safe-area-inset-top))]', className)}
    >
      {children}
    </motion.div>
  )
}

/** Bloco que entra deslizando junto com os irmãos. */
export function Rise({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={riseIn} className={className}>
      {children}
    </motion.div>
  )
}

export function Fade({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fade} className={className}>
      {children}
    </motion.div>
  )
}

interface ScreenHeaderProps {
  title?: string
  subtitle?: string
  back?: boolean | (() => void)
  action?: ReactNode
  className?: string
}

export function ScreenHeader({ title, subtitle, back, action, className }: ScreenHeaderProps) {
  const navigate = useNavigate()
  const onBack = typeof back === 'function' ? back : () => navigate(-1)

  return (
    <header className={cn(GUTTER, 'flex items-start gap-3 pb-2', className)}>
      {back && (
        <motion.button
          type="button"
          onClick={onBack}
          whileTap={{ scale: 0.92 }}
          transition={spring.snappy}
          aria-label="Voltar"
          className="-ml-2.5 mt-0.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronLeft size={23} strokeWidth={2} />
        </motion.button>
      )}

      <div className="min-w-0 flex-1">
        {title && <h1 className="font-display text-[1.75rem] leading-tight text-ink">{title}</h1>}
        {subtitle && <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">{subtitle}</p>}
      </div>

      {action && <div className="mt-0.5 shrink-0">{action}</div>}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn(GUTTER, 'flex items-baseline justify-between gap-4 pb-3.5')}>
      <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.09em] text-ink-3">{children}</h2>
      {action}
    </div>
  )
}
