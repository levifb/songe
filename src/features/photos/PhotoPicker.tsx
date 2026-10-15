import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ImagePlus, Loader2, X } from 'lucide-react'
import { Sheet } from '@/design/primitives/Sheet'
import { PHOTO_LIBRARY } from '@/data/photoLibrary'
import { compressImage } from '@/lib/image'
import { repository } from '@/app/repository'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'
import type { PhotoRef } from '@/domain/types'

interface PhotoPickerProps {
  open: boolean
  onClose: () => void
  selected: PhotoRef | null
  onSelect: (photo: PhotoRef | null) => void
}

/**
 * Escolha de capa: a biblioteca embutida ou uma foto do celular.
 * A proporção de corte é sempre 3:2 — é assim que a capa aparece no card
 * e no topo dos detalhes, então o que se vê aqui é o que fica lá.
 */
export function PhotoPicker({ open, onClose, selected, onSelect }: PhotoPickerProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFileChosen(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const compressed = await compressImage(file)
      onSelect(await repository.uploadPhoto(compressed.blob, 'goalCover'))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui usar essa imagem.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Escolher uma foto">
      <div className="px-5 pb-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[1.5rem] text-ink">Escolher uma foto</h2>
          <span className="text-[0.75rem] text-ink-3">corte 3:2</span>
        </div>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
          Use uma da biblioteca por enquanto e troque pela foto de vocês quando quiser.
        </p>
      </div>

      <div className="px-5 pt-5">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onFileChosen(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="flex w-full items-center gap-3.5 rounded-lg border border-dashed border-line bg-surface-2 p-4 text-left transition-colors hover:border-accent/50 hover:bg-surface disabled:opacity-60"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            {busy ? <Loader2 size={19} className="animate-spin" /> : <ImagePlus size={19} strokeWidth={1.9} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-medium text-ink">
              {busy ? 'Preparando a imagem…' : 'Escolher do celular'}
            </span>
            <span className="block text-[0.8125rem] text-ink-3">
              A foto é reduzida no aparelho antes de subir.
            </span>
          </span>
        </button>

        {error && <p role="alert" className="mt-3 text-[0.8125rem] text-danger">{error}</p>}

        {selected && (
          <button
            type="button"
            onClick={() => {
              onSelect(null)
              onClose()
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md py-3 text-[0.875rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={15} strokeWidth={2} />
            Remover a foto atual
          </button>
        )}
      </div>

      <div className="px-5 pb-6 pt-7">
        <p className="pb-3.5 text-[0.8125rem] font-semibold uppercase tracking-[0.09em] text-ink-3">Biblioteca</p>

        <div className="grid grid-cols-2 gap-3">
          {PHOTO_LIBRARY.map((photo) => {
            const isSelected = selected?.id === photo.id
            return (
              <motion.button
                key={photo.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={spring.snappy}
                onClick={() => {
                  onSelect({
                    id: photo.id,
                    kind: 'preset',
                    src: photo.src,
                    focalX: photo.focalX,
                    focalY: photo.focalY,
                    credit: photo.credit,
                  })
                  onClose()
                }}
                className={cn(
                  'relative aspect-3/2 overflow-hidden rounded-md ring-2 transition-all',
                  isSelected ? 'ring-accent' : 'ring-transparent hover:ring-line',
                )}
              >
                <img
                  src={photo.thumb}
                  alt={photo.title}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover"
                  style={{
                    objectPosition: `${photo.focalX * 100}% ${photo.focalY * 100}%`,
                    backgroundImage: `url(${photo.lqip})`,
                    backgroundSize: 'cover',
                  }}
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6 text-left text-[0.75rem] font-medium text-white">
                  {photo.title}
                </span>
                {isSelected && (
                  <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-on-accent">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
