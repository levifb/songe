import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Photo } from '@/design/primitives/Photo'
import { ProgressBar, type ProgressSegment } from '@/design/primitives/ProgressBar'
import { Money } from '@/design/primitives/Money'
import { formatPercent, progressPercent } from '@/lib/money'
import { splitByMember, remainingCents, overflowCents } from '@/domain/goals'
import { spring } from '@/design/motion'
import type { Goal, User } from '@/domain/types'

interface GoalCardProps {
  goal: Goal
  members: User[]
}

export function GoalCard({ goal, members }: GoalCardProps) {
  const split = splitByMember(goal, members)
  const segments: ProgressSegment[] = split.map((entry) => ({
    id: entry.user.id,
    ratio: goal.targetCents > 0 ? entry.cents / goal.targetCents : 0,
    tone: entry.tone,
  }))

  const percent = progressPercent(goal.totalCents, goal.targetCents)
  const achieved = goal.status === 'achieved'
  const overflow = overflowCents(goal)

  return (
    <motion.div whileTap={{ scale: 0.985 }} transition={spring.snappy}>
      <Link
        to={`/metas/${goal.id}`}
        className="block overflow-hidden rounded-xl bg-surface shadow-lift ring-1 ring-line-soft/60"
      >
        <Photo photo={goal.cover} ratio="3/2" overlay="bottom" rounded="rounded-none" alt={goal.title}>
          <div className="flex size-full flex-col justify-end p-5">
            {achieved && (
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[0.75rem] font-semibold text-pine-700 backdrop-blur">
                <Check size={13} strokeWidth={3} />
                Conquistada
              </span>
            )}
            <h3 className="font-display text-[1.625rem] leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
              {goal.title}
            </h3>
          </div>
        </Photo>

        <div className="space-y-4 p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <Money cents={goal.totalCents} className="font-display text-[1.75rem] leading-none text-ink" />
              <p className="mt-1.5 text-[0.875rem] text-ink-3">
                de <Money cents={goal.targetCents} className="text-ink-2" />
              </p>
            </div>
            <span className="numeric shrink-0 font-display text-[1.375rem] leading-none text-accent">
              {formatPercent(percent)}
            </span>
          </div>

          <ProgressBar segments={segments} label={`Progresso de ${goal.title}`} />

          <p className="text-[0.875rem] text-ink-2">
            {achieved ? (
              overflow > 0 ? (
                <>
                  <Money cents={overflow} className="font-medium text-pine-600 dark:text-pine-300" /> além do objetivo
                </>
              ) : (
                'Objetivo alcançado.'
              )
            ) : (
              <>
                Faltam <Money cents={remainingCents(goal)} className="font-medium text-ink" />
              </>
            )}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
