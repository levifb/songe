import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

/**
 * Folha que sobe de baixo. Fecha no toque do fundo, no arrasto para baixo
 * e no Esc — as três saídas que a pessoa vai tentar instintivamente.
 */
export function Sheet({ open, onClose, children, title, className }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-alpine-950/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative w-full max-w-[27rem] max-h-[92dvh] overflow-y-auto no-scrollbar',
              'bg-ground rounded-t-2xl shadow-float',
              'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
              className,
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.sheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 550) onClose()
            }}
          >
            <div className="sticky top-0 z-10 flex justify-center bg-ground/90 backdrop-blur-sm pt-3 pb-2">
              <span className="h-1 w-10 rounded-full bg-alpine-300 dark:bg-alpine-600" aria-hidden />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
