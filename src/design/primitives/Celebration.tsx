import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

interface CelebrationProps {
  /** Liga a chuva de confete. Desliga sozinha; só precisa voltar a false depois. */
  active: boolean
  pieces?: number
}

const COLORS = ['#D4862A', '#EDB86F', '#3F7A6B', '#85B4A6', '#FFFFFF', '#CFD9E5']

/**
 * Confete discreto: papéis pequenos, poucos, caindo devagar e sumindo.
 * A ideia é "que bom", não "parabéns, você ganhou um prêmio".
 */
export function Celebration({ active, pieces = 26 }: CelebrationProps) {
  const confetti = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.4 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 90,
        rotation: Math.random() * 720 - 360,
        size: 5 + Math.random() * 5,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.65,
      })),
    [pieces],
  )

  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
          {confetti.map((piece) => (
            <motion.span
              key={piece.id}
              className="absolute top-[-6%]"
              style={{
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.size * (piece.round ? 1 : 1.7),
                background: piece.color,
                borderRadius: piece.round ? '50%' : 2,
              }}
              initial={{ y: '-10vh', opacity: 0, rotate: 0 }}
              animate={{
                y: '108vh',
                x: piece.drift,
                rotate: piece.rotation,
                opacity: [0, 1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: [0.25, 0.6, 0.4, 1],
                opacity: { times: [0, 0.1, 0.75, 1], duration: piece.duration, delay: piece.delay },
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
