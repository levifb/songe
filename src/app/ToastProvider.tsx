import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, CircleAlert } from 'lucide-react'
import { spring } from '@/design/motion'

type ToastTone = 'success' | 'error'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

interface ToastValue {
  notify: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3800)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={spring.soft}
              className="flex max-w-[26rem] items-center gap-2.5 rounded-full bg-alpine-900 py-2.5 pl-3 pr-5 text-white shadow-float dark:bg-alpine-100 dark:text-alpine-900"
            >
              <span
                className={
                  toast.tone === 'success'
                    ? 'grid size-6 shrink-0 place-items-center rounded-full bg-pine-500/90 text-white'
                    : 'grid size-6 shrink-0 place-items-center rounded-full bg-danger text-white'
                }
              >
                {toast.tone === 'success' ? <Check size={14} strokeWidth={3} /> : <CircleAlert size={14} strokeWidth={2.5} />}
              </span>
              <span className="text-[0.9375rem] leading-snug">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast precisa estar dentro de ToastProvider')
  return value
}
