import { Link } from 'react-router-dom'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useData } from '@/app/DataProvider'
import { useSession } from '@/app/SessionProvider'
import { Money } from '@/design/primitives/Money'
import { ProgressBar, type ProgressSegment } from '@/design/primitives/ProgressBar'
import { Rise, Screen, SectionTitle, GUTTER } from '@/design/primitives/Screen'
import { Avatar } from '@/design/primitives/Avatar'
import { GoalCard } from '@/features/goals/GoalCard'
import { EmptyGoals } from '@/features/goals/EmptyGoals'
import { SplitRow } from '@/features/goals/SplitRow'
import { RecentActivity } from '@/features/activity/RecentActivity'
import { AchievementShelf } from '@/features/goals/AchievementShelf'
import { splitByMember } from '@/domain/goals'
import { dashboardPhrase, greeting } from '@/data/phrases'
import { monthKey } from '@/lib/dates'
import { cn } from '@/lib/cn'

export function DashboardScreen() {
  const { user, members, partner } = useSession()
  const { activeGoals, achievedGoals, goals, totals, contributions } = useData()

  if (!user) return null

  const split = splitByMember(totals, members)
  const segments: ProgressSegment[] = split.map((entry) => ({
    id: entry.user.id,
    ratio: totals.targetCents > 0 ? entry.cents / totals.targetCents : 0,
    tone: entry.tone,
  }))

  const thisMonth = monthKey(new Date())
  const phrase = dashboardPhrase({
    hasPartner: Boolean(partner),
    goalCount: goals.length,
    totalCents: totals.totalCents,
    targetCents: totals.targetCents,
    contributedThisMonth: contributions.some((c) => monthKey(c.date) === thisMonth),
    justAchieved: achievedGoals.some(
      (g) => g.achievedAt && Date.now() - g.achievedAt.getTime() < 48 * 60 * 60 * 1000,
    ),
  })

  return (
    <Screen className="pb-6">
      <Rise className={cn(GUTTER, 'flex items-center justify-between gap-4 pt-2')}>
        <div className="min-w-0">
          <p className="text-[0.9375rem] text-ink-2">{greeting(user.name)}</p>
        </div>
        <Link to="/nos" aria-label="Perfil e ajustes" className="shrink-0">
          <Avatar name={user.name} photoUrl={user.photoUrl} size="sm" tone="mine" />
        </Link>
      </Rise>

      {/* O número primeiro: não "quanto falta", mas quanto já existe.
          Sem nenhuma meta, porém, um "R$ 0" gigante só desanima — aí a tela
          fica com o convite e mais nada. */}
      <Rise className={cn(GUTTER, 'pt-7')}>
        {goals.length > 0 ? (
          <>
            <p className="text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-ink-3">
              {partner ? 'Vocês já construíram' : 'Você já construiu'}
            </p>
            <Money
              cents={totals.totalCents}
              animated
              className="mt-2.5 block font-display text-[3.25rem] leading-[0.95] tracking-[-0.03em] text-ink"
            />

            <div className="mt-5">
              <ProgressBar segments={segments} height="thin" label="Progresso geral" />
            </div>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <SplitRow split={split} currentUserId={user.id} />
              <p className="text-[0.875rem] text-ink-3">
                de <Money cents={totals.targetCents} className="text-ink-2" />
              </p>
            </div>
          </>
        ) : null}

        <p className={cn('font-display text-[1.0625rem] leading-relaxed text-ink-2', goals.length > 0 && 'mt-6')}>
          {phrase}
        </p>
      </Rise>

      {!partner && (
        <Rise className={cn(GUTTER, 'pt-7')}>
          <Link
            to="/conectar"
            className="flex items-center gap-4 rounded-lg border border-dashed border-line bg-surface-2 p-4 transition-colors hover:border-accent/50 hover:bg-surface"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <UserPlus size={19} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-medium text-ink">Convide sua parceira</span>
              <span className="block text-[0.8125rem] text-ink-3">Um código de 6 letras e vocês ficam juntos aqui.</span>
            </span>
            <ArrowRight size={17} className="shrink-0 text-ink-3" />
          </Link>
        </Rise>
      )}

      {goals.length === 0 ? (
        <Rise className="pt-9">
          <EmptyGoals />
        </Rise>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <section className="pt-11">
              <Rise>
                <SectionTitle
                  action={
                    activeGoals.length > 2 ? (
                      <Link to="/metas" className="text-[0.8125rem] font-medium text-accent">
                        Ver todas
                      </Link>
                    ) : undefined
                  }
                >
                  Nossas metas
                </SectionTitle>
              </Rise>
              <div className={cn(GUTTER, 'space-y-5')}>
                {activeGoals.slice(0, 3).map((goal) => (
                  <Rise key={goal.id}>
                    <GoalCard goal={goal} members={members} />
                  </Rise>
                ))}
              </div>
            </section>
          )}

          <RecentActivity />
          <AchievementShelf />
        </>
      )}
    </Screen>
  )
}
