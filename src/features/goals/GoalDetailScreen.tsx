import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Pencil, Plus } from 'lucide-react'
import { useData } from '@/app/DataProvider'
import { useSession } from '@/app/SessionProvider'
import { Money } from '@/design/primitives/Money'
import { Photo } from '@/design/primitives/Photo'
import { ProgressBar, type ProgressSegment } from '@/design/primitives/ProgressBar'
import { Button } from '@/design/primitives/Button'
import { Rise, Screen, SectionTitle } from '@/design/primitives/Screen'
import { Surface } from '@/design/primitives/Surface'
import { SplitRow } from './SplitRow'
import { CumulativeChart } from './CumulativeChart'
import { ProjectionCard } from './ProjectionCard'
import { ContributionTimeline } from '@/features/contributions/ContributionTimeline'
import { EditContributionSheet } from '@/features/contributions/EditContributionSheet'
import { overflowCents, remainingCents, splitByMember } from '@/domain/goals'
import { computeProjection, cumulativeByMonth } from '@/domain/projection'
import { formatPercent, progressPercent } from '@/lib/money'
import { formatFullDate } from '@/lib/dates'
import { spring } from '@/design/motion'
import type { Contribution } from '@/domain/types'

export function GoalDetailScreen() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, members } = useSession()
  const { goalById, contributionsOf } = useData()
  const [editing, setEditing] = useState<Contribution | null>(null)

  const goal = goalId ? goalById(goalId) : undefined
  const contributions = useMemo(() => (goalId ? contributionsOf(goalId) : []), [goalId, contributionsOf])

  const points = useMemo(
    () => cumulativeByMonth(contributions, members.map((m) => m.id)),
    [contributions, members],
  )
  const projection = useMemo(
    () => (goal ? computeProjection(goal, contributions) : null),
    [goal, contributions],
  )

  if (!goal || !user) {
    return (
      <Screen className="px-5 pb-10 pt-20 text-center">
        <p className="font-display text-[1.5rem] text-ink">Meta não encontrada</p>
        <p className="mt-3 text-[0.9375rem] text-ink-2">Ela pode ter sido apagada.</p>
        <Button className="mt-7" variant="secondary" onClick={() => navigate('/metas')}>
          Ver todas as metas
        </Button>
      </Screen>
    )
  }

  const split = splitByMember(goal, members)
  const segments: ProgressSegment[] = split.map((entry) => ({
    id: entry.user.id,
    ratio: goal.targetCents > 0 ? entry.cents / goal.targetCents : 0,
    tone: entry.tone,
  }))

  const percent = progressPercent(goal.totalCents, goal.targetCents)
  const remaining = remainingCents(goal)
  const overflow = overflowCents(goal)

  return (
    <Screen bleed className="pb-10">
      {/* A capa sangra até o topo, passando por baixo da barra de status. */}
      <div className="relative">
        <Photo photo={goal.cover} ratio="4/3" overlay="bottom" rounded="rounded-none" alt={goal.title}>
          <div className="flex size-full flex-col justify-between p-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-3">
              <motion.button
                type="button"
                onClick={() => navigate(-1)}
                whileTap={{ scale: 0.92 }}
                transition={spring.snappy}
                aria-label="Voltar"
                className="grid size-10 place-items-center rounded-full bg-alpine-950/40 text-white backdrop-blur-sm"
              >
                <ChevronLeft size={21} strokeWidth={2} />
              </motion.button>

              <Link
                to={`/metas/${goal.id}/editar`}
                aria-label="Editar meta"
                className="grid size-10 place-items-center rounded-full bg-alpine-950/40 text-white backdrop-blur-sm"
              >
                <Pencil size={17} strokeWidth={2} />
              </Link>
            </div>

            <div>
              {goal.status === 'achieved' && (
                <span className="mb-3 inline-block rounded-full bg-white/95 px-3 py-1.5 text-[0.75rem] font-semibold text-pine-700">
                  Conquistada
                </span>
              )}
              <h1 className="font-display text-[2.125rem] leading-[1.1] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
                {goal.title}
              </h1>
              {goal.description && (
                <p className="mt-2.5 max-w-[22rem] text-[0.9375rem] leading-relaxed text-white/75">
                  {goal.description}
                </p>
              )}
            </div>
          </div>
        </Photo>
      </div>

      <Rise className="px-5 pt-7">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <Money
              cents={goal.totalCents}
              animated
              className="block font-display text-[2.5rem] leading-none tracking-[-0.025em] text-ink"
            />
            <p className="mt-2 text-[0.9375rem] text-ink-3">
              de <Money cents={goal.targetCents} className="text-ink-2" />
            </p>
          </div>
          <span className="numeric shrink-0 font-display text-[1.625rem] leading-none text-accent">
            {formatPercent(percent)}
          </span>
        </div>

        <div className="mt-5">
          <ProgressBar segments={segments} height="thick" label={`Progresso de ${goal.title}`} />
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <SplitRow split={split} currentUserId={user.id} />
          <p className="text-[0.875rem] text-ink-2">
            {remaining > 0 ? (
              <>
                Faltam <Money cents={remaining} className="font-medium text-ink" />
              </>
            ) : overflow > 0 ? (
              <>
                <Money cents={overflow} className="font-medium text-pine-600 dark:text-pine-300" /> além
              </>
            ) : (
              'Objetivo alcançado.'
            )}
          </p>
        </div>

        {goal.deadline && (
          <p className="mt-4 text-[0.8125rem] text-ink-3">Prazo: {formatFullDate(goal.deadline)}</p>
        )}
      </Rise>

      <Rise className="px-5 pt-7">
        <Button
          full
          size="lg"
          onClick={() => navigate('/aportar', { state: { background: location, goalId: goal.id } })}
        >
          <Plus size={19} strokeWidth={2.3} />
          Registrar contribuição
        </Button>
      </Rise>

      <Rise className="px-5 pt-7">
        <ProjectionCard
          projection={projection}
          contributionCount={contributions.length}
          remainingCents={remaining}
        />
      </Rise>

      {points.length >= 2 && (
        <section className="pt-11">
          <Rise>
            <SectionTitle>A subida</SectionTitle>
          </Rise>
          <Rise className="px-5">
            <Surface elevation="flat" className="p-5">
              <CumulativeChart points={points} members={members} targetCents={goal.targetCents} />
            </Surface>
          </Rise>
        </section>
      )}

      <section className="pt-11">
        <Rise>
          <SectionTitle>Histórico</SectionTitle>
        </Rise>
        <Rise className="px-5">
          <ContributionTimeline
            contributions={contributions}
            members={members}
            currentUserId={user.id}
            onSelect={setEditing}
            emptyMessage="Nenhuma contribuição ainda. O primeiro registro é logo ali no botão."
          />
        </Rise>
      </section>

      <EditContributionSheet
        contribution={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
      />
    </Screen>
  )
}
