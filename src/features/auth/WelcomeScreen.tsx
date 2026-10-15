import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/design/primitives/Button'
import { findLibraryPhoto } from '@/data/photoLibrary'

const HERO = findLibraryPhoto('luzes-na-montanha') ?? null

export function WelcomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-dvh overflow-hidden bg-alpine-950">
      {HERO && (
        <motion.img
          src={HERO.src}
          alt=""
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: '50% 55%' }}
        />
      )}

      {/* Duas camadas: uma escurece o todo, outra ancora o texto embaixo. */}
      <div className="absolute inset-0 bg-alpine-950/35" />
      <div className="absolute inset-0 bg-linear-to-t from-alpine-950 via-alpine-950/70 via-45% to-transparent" />

      <div className="relative flex min-h-dvh flex-col justify-end px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-[3.25rem] leading-none tracking-[-0.025em] text-white">Songe</h1>
          <p className="mt-4 max-w-[22rem] text-[1.0625rem] leading-relaxed text-white/80">
            O lugar onde vocês dois acompanham, mês a mês, o que estão construindo juntos.
          </p>
        </motion.div>

        <motion.div
          className="mt-10 space-y-3"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button full size="lg" onClick={() => navigate('/criar-conta')}>
            Criar nossa conta
          </Button>
          <Button
            full
            size="lg"
            variant="ghost"
            className="text-white/85 hover:bg-white/10 hover:text-white"
            onClick={() => navigate('/entrar')}
          >
            Já tenho conta
          </Button>
        </motion.div>

        {HERO?.credit && (
          <p className="mt-6 text-center text-[0.6875rem] text-white/35">Foto: {HERO.credit}</p>
        )}
      </div>
    </div>
  )
}
