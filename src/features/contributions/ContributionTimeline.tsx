import { motion } from 'framer-motion'
import { Pencil } from 'lucide-react'
import { Money } from '@/design/primitives/Money'
import { dayAndMonth } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'
import type { Contribution, User } from '@/domain/types'

interface ContributionTimelineProps {
  contributions: Contribution[]
  members: User[]
  currentUserId: string
  /** Só as próprias contribuições abrem para edição. */
  onSelect?: (contribution: Contribution) => void
  emptyMessage?: string
}

/**
 * Linha do tempo, não tabela. A data fica à esquerda como carimbo, e o
 * traço vertical costura os registros num fio só.
 */
export function ContributionTimeline({
  contributions,
  members,
  currentUserId,
  onSelect,
  emptyMessage = 'Nenhum registro ainda.',
}: ContributionTimelineProps) {
  if (contributions.length === 0) {
    return <p className="py-8 text-center text-[0.9375rem] text-ink-3">{emptyMessage}</p>
  }

  return (
    <ol className="relative">
      {/* O fio da linha do tempo. Começa e termina dentro dos itens das pontas. */}
      <span className="absolute bottom-6 left-[3.4rem] top-6 w-px bg-line" aria-hidden />

      {contributions.map((contribution, index) => {
        const author = members.find((m) => m.id === contribution.userId)
        const isMine = contribution.userId === currentUserId
        const tone = members[0]?.id === contribution.userId ? 'mine' : 'hers'
        const { day, month } = dayAndMonth(contribution.date)
        const editable = isMine && Boolean(onSelect)

        return (
          <motion.li
            key={contribution.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: Math.min(index * 0.045, 0.35) }}
          >
            <button
              type="button"
              disabled={!editable}
              onClick={() => editable && onSelect?.(contribution)}
              className={cn(
                'flex w-full items-start gap-4 rounded-lg py-3.5 pl-1 pr-3 text-left transition-colors',
                editable ? 'hover:bg-surface-2' : 'cursor-default',
              )}
            >
              <div className="w-11 shrink-0 pt-0.5 text-center">
                <span className="numeric block font-display text-[1.125rem] leading-none text-ink">{day}</span>
                <span className="mt-1 block text-[0.625rem] font-semibold tracking-[0.1em] text-ink-3">{month}</span>
              </div>

              <span
                className={cn(
                  'mt-2 size-2.5 shrink-0 rounded-full ring-4 ring-ground',
                  tone === 'mine' ? 'bg-mine' : 'bg-hers',
                )}
                aria-hidden
              />

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[0.9375rem] text-ink-2">
                    {isMine ? 'Você' : (author?.name ?? 'Alguém')}
                  </span>
                  <Money
                    cents={contribution.amountCents}
                    className={cn(
                      'shrink-0 font-display text-[1.125rem] leading-none',
                      tone === 'mine' ? 'text-mine' : 'text-hers',
                    )}
                  />
                </div>
                {contribution.note && (
                  <p className="mt-1.5 text-[0.875rem] leading-snug text-ink-3">{contribution.note}</p>
                )}
                {contribution.editedAt && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[0.6875rem] text-ink-3/80">
                    <Pencil size={10} strokeWidth={2} />
                    editado
                  </span>
                )}
              </div>
            </button>
          </motion.li>
        )
      })}
    </ol>
  )
}
