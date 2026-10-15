import { Link } from 'react-router-dom'
import { useData } from '@/app/DataProvider'
import { useSession } from '@/app/SessionProvider'
import { Money } from '@/design/primitives/Money'
import { Rise, SectionTitle, GUTTER } from '@/design/primitives/Screen'
import { relativeDay } from '@/lib/dates'
import { cn } from '@/lib/cn'

/** As últimas movimentações no dashboard: quatro linhas, sem virar extrato. */
export function RecentActivity() {
  const { user, members } = useSession()
  const { contributions, goalById } = useData()

  if (!user || contributions.length === 0) return null
  const recent = contributions.slice(0, 4)

  return (
    <section className="pt-11">
      <Rise>
        <SectionTitle
          action={
            contributions.length > 4 ? (
              <Link to="/novidades" className="text-[0.8125rem] font-medium text-accent">
                Ver tudo
              </Link>
            ) : undefined
          }
        >
          Últimas movimentações
        </SectionTitle>
      </Rise>

      <Rise className={GUTTER}>
        <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line-soft bg-surface">
          {recent.map((contribution) => {
            const goal = goalById(contribution.goalId)
            const isMine = contribution.userId === user.id
            const tone = members[0]?.id === contribution.userId ? 'mine' : 'hers'
            const author = members.find((m) => m.id === contribution.userId)

            return (
              <li key={contribution.id}>
                <Link
                  to={goal ? `/metas/${goal.id}` : '/metas'}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <span
                    className={cn('size-2 shrink-0 rounded-full', tone === 'mine' ? 'bg-mine' : 'bg-hers')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] text-ink">
                      {isMine ? 'Você' : (author?.name ?? 'Alguém')}
                      <span className="text-ink-3"> · {goal?.title ?? 'meta removida'}</span>
                    </span>
                    <span className="block text-[0.8125rem] text-ink-3">{relativeDay(contribution.date)}</span>
                  </span>
                  <Money
                    cents={contribution.amountCents}
                    className="shrink-0 font-display text-[1.0625rem] leading-none text-ink"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </Rise>
    </section>
  )
}
