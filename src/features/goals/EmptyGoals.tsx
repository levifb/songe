import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/design/primitives/Button'
import { Snowfall } from '@/design/primitives/Snowfall'
import { findLibraryPhoto } from '@/data/photoLibrary'

const BACKDROP = findLibraryPhoto('bosque-em-silencio')

/**
 * O primeiro estado do app. Precisa parecer um convite, e não um erro
 * de "nenhum registro encontrado".
 */
export function EmptyGoals() {
  const navigate = useNavigate()

  return (
    <div className="px-5">
      <div className="relative overflow-hidden rounded-2xl">
        {BACKDROP && (
          <img
            src={BACKDROP.src}
            alt=""
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: '50% 45%' }}
          />
        )}
        <div className="absolute inset-0 bg-alpine-950/45" />
        <div className="absolute inset-0 bg-linear-to-t from-alpine-950/90 via-alpine-950/45 to-alpine-950/20" />
        <Snowfall count={16} />

        <motion.div
          className="relative flex flex-col items-start px-6 py-14"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-[2.125rem] leading-[1.15] tracking-[-0.02em] text-white">
            Um futuro inteiro
            <br />
            para construir
          </h2>
          <p className="mt-4 max-w-[19rem] text-[1rem] leading-relaxed text-white/75">
            Comecem pela primeira meta de vocês. Pode ser grande, pode ser pequena — o que importa é ter para
            onde olhar.
          </p>

          <Button size="lg" className="mt-8" onClick={() => navigate('/metas/nova')}>
            <Plus size={19} strokeWidth={2.3} />
            Criar primeira meta
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
