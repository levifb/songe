import type { Transition, Variants } from 'framer-motion'

/**
 * Três molas, e só três. Toda animação do Songe sai de uma delas,
 * senão cada tela ganha um tempo próprio e o app perde o corpo.
 */
export const spring = {
  /** Padrão: entradas, trocas de estado, quase tudo. */
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as Transition,
  /** Reações a toque — precisa responder antes do dedo sair da tela. */
  snappy: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } as Transition,
  /** Movimentos grandes: folhas subindo, telas cheias. */
  sheet: { type: 'spring', stiffness: 300, damping: 34, mass: 1 } as Transition,
} as const

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
}

/** Conteúdo que sobe de baixo, com uma sombra de atraso entre irmãos. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: spring.soft },
}

export const stagger = (delayChildren = 0.04, staggerChildren = 0.055): Variants => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren } },
})

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: ease.out } },
}

/** Feedback de toque: encolhe um fio, nunca mais que isso. */
export const pressable = {
  whileTap: { scale: 0.975 },
  transition: spring.snappy,
} as const
