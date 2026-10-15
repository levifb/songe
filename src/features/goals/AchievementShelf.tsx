import { Link } from 'react-router-dom'
import { useData } from '@/app/DataProvider'
import { Photo } from '@/design/primitives/Photo'
import { Money } from '@/design/primitives/Money'
import { Rise, SectionTitle, GUTTER } from '@/design/primitives/Screen'
import { monthAndYear } from '@/lib/dates'
import { cn } from '@/lib/cn'

/**
 * As metas alcançadas não somem: viram uma prateleira de lembranças
 * no fim do dashboard, com a foto, a data e o valor final.
 */
export function AchievementShelf() {
  const { achievedGoals } = useData()
  if (achievedGoals.length === 0) return null

  return (
    <section className="pt-11">
      <Rise>
        <SectionTitle>Conquistas</SectionTitle>
      </Rise>

      <Rise>
        <div className={cn('no-scrollbar flex gap-4 overflow-x-auto pb-2', GUTTER)}>
          {achievedGoals.map((goal) => (
            <Link
              key={goal.id}
              to={`/metas/${goal.id}`}
              className="w-[13.5rem] shrink-0 overflow-hidden rounded-lg bg-surface shadow-soft ring-1 ring-line-soft/60"
            >
              <Photo photo={goal.cover} ratio="4/3" overlay="soft" rounded="rounded-none" alt={goal.title} />
              <div className="p-4">
                <h3 className="truncate font-display text-[1.0625rem] leading-tight text-ink">{goal.title}</h3>
                <p className="mt-2">
                  <Money cents={goal.totalCents} className="text-[0.9375rem] font-medium text-ink-2" />
                </p>
                {goal.achievedAt && (
                  <p className="mt-1 text-[0.75rem] text-ink-3">Concluída em {monthAndYear(goal.achievedAt)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Rise>
    </section>
  )
}
