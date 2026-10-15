import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SurfaceProps {
  children?: ReactNode
  className?: string
  /** 'flat' encosta no fundo, 'raised' descola, 'inset' afunda. */
  elevation?: 'flat' | 'raised' | 'inset'
  as?: 'div' | 'section' | 'article' | 'li'
}

const elevations = {
  flat: 'bg-surface border border-line-soft',
  raised: 'bg-surface shadow-lift border border-line-soft/60',
  inset: 'bg-surface-2 border border-line-soft',
}

export function Surface({ children, className, elevation = 'flat', as: Tag = 'div' }: SurfaceProps) {
  return <Tag className={cn('rounded-lg', elevations[elevation], className)}>{children}</Tag>
}
