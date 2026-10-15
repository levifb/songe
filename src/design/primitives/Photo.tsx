import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { PhotoRef } from '@/domain/types'

type Ratio = '16/9' | '3/2' | '4/3' | '1/1' | '4/5' | '3/4' | '21/9'
type Overlay = 'none' | 'bottom' | 'soft' | 'full'

interface PhotoProps {
  photo: PhotoRef | null
  ratio?: Ratio
  overlay?: Overlay
  className?: string
  imageClassName?: string
  rounded?: string
  alt?: string
  /** Conteúdo posicionado sobre a foto, já acima do gradiente. */
  children?: React.ReactNode
}

const ratioClass: Record<Ratio, string> = {
  '21/9': 'aspect-[21/9]',
  '16/9': 'aspect-[16/9]',
  '3/2': 'aspect-[3/2]',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '4/5': 'aspect-[4/5]',
  '3/4': 'aspect-[3/4]',
}

/**
 * Gradientes de legibilidade. Sem eles, uma foto de neve engole
 * texto branco e uma foto noturna engole texto escuro.
 */
const overlayClass: Record<Overlay, string> = {
  none: '',
  soft: 'bg-linear-to-t from-black/35 via-black/5 to-transparent',
  bottom: 'bg-linear-to-t from-black/72 via-black/28 via-45% to-black/5',
  full: 'bg-linear-to-t from-black/80 via-black/40 to-black/20',
}

export function Photo({
  photo,
  ratio = '16/9',
  overlay = 'none',
  className,
  imageClassName,
  rounded = 'rounded-lg',
  alt = '',
  children,
}: PhotoProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={cn('relative overflow-hidden isolate', ratioClass[ratio], rounded, className)}>
      {photo ? (
        <img
          src={photo.src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ objectPosition: `${photo.focalX * 100}% ${photo.focalY * 100}%` }}
          className={cn(
            'absolute inset-0 size-full object-cover',
            'transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
            loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105',
            imageClassName,
          )}
        />
      ) : (
        <PhotoPlaceholder />
      )}

      {overlay !== 'none' && photo && (
        <div className={cn('absolute inset-0 pointer-events-none', overlayClass[overlay])} aria-hidden />
      )}

      {children && <div className="absolute inset-0">{children}</div>}
    </div>
  )
}

/** Sem foto: um horizonte de montanha desenhado, não um retângulo cinza. */
function PhotoPlaceholder() {
  return (
    <div className="absolute inset-0 bg-linear-to-b from-alpine-100 to-alpine-200 dark:from-alpine-800 dark:to-alpine-900">
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full text-alpine-300/70 dark:text-alpine-700/70"
        aria-hidden
      >
        <path d="M0 200 L92 96 L140 138 L214 58 L286 132 L330 104 L400 168 L400 200 Z" fill="currentColor" />
        <path d="M0 200 L64 148 L128 178 L196 130 L268 182 L336 150 L400 190 L400 200 Z" fill="currentColor" opacity="0.55" />
      </svg>
    </div>
  )
}
