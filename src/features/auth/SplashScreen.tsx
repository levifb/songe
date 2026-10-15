import { motion } from 'framer-motion'
import { Snowfall } from '@/design/primitives/Snowfall'

/**
 * O que aparece enquanto a sessão é verificada. Curto por natureza —
 * se demorar o suficiente para ser lido, alguma coisa está errada.
 */
export function SplashScreen() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ground">
      <div className="absolute inset-0 bg-radial-[at_50%_38%] from-ember-100/70 via-ground to-ground dark:from-ember-900/25 dark:via-ground dark:to-ground" />
      <Snowfall count={14} />

      <motion.div
        className="relative text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="font-display text-[2.75rem] leading-none tracking-[-0.02em] text-ink">Songe</h1>
        <motion.div
          className="mx-auto mt-4 h-px bg-accent/60"
          initial={{ width: 0 }}
          animate={{ width: 48 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
    </div>
  )
}
