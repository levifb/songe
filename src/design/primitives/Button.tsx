import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
  full?: boolean
  className?: string
  'aria-label'?: string
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent shadow-lift hover:bg-accent-hover disabled:bg-alpine-300 disabled:text-white disabled:shadow-none dark:disabled:bg-alpine-700 dark:disabled:text-alpine-500',
  secondary:
    'bg-surface text-ink border border-line shadow-soft hover:bg-surface-2',
  ghost:
    'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-transparent text-danger border border-danger/25 hover:bg-danger/8',
}

/** Altura mínima de 44px em todos os tamanhos — alvo de toque confortável. */
const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-[0.9375rem] rounded-sm',
  md: 'h-[3.25rem] px-6 text-base rounded-md',
  lg: 'h-[3.625rem] px-7 text-[1.0625rem] rounded-lg',
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  full = false,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileTap={isDisabled ? undefined : { scale: 0.975 }}
      transition={spring.snappy}
      aria-busy={loading || undefined}
      aria-label={rest['aria-label']}
      className={cn(
        'relative inline-flex items-center justify-center gap-2.5 font-medium tracking-[-0.005em]',
        'transition-colors duration-200 select-none',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
    >
      <span className={cn('inline-flex items-center gap-2.5', loading && 'opacity-0')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
    </motion.button>
  )
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
