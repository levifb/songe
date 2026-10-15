import { cn } from '@/lib/cn'

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  tone?: 'mine' | 'hers' | 'neutral'
  className?: string
}

const sizes = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-20 text-xl',
}

const tones = {
  mine: 'bg-ember-100 text-ember-800 dark:bg-ember-900/60 dark:text-ember-200',
  hers: 'bg-pine-100 text-pine-800 dark:bg-pine-900/60 dark:text-pine-200',
  neutral: 'bg-alpine-100 text-alpine-700 dark:bg-alpine-800 dark:text-alpine-200',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, photoUrl, size = 'md', tone = 'neutral', className }: AvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-surface', sizes[size], className)}
      />
    )
  }

  return (
    <span
      aria-label={name}
      className={cn(
        'inline-grid place-items-center rounded-full font-semibold tracking-wide select-none',
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
