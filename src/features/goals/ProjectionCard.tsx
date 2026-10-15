import { CalendarClock, TrendingUp } from 'lucide-react'
import { Money } from '@/design/primitives/Money'
import { Surface } from '@/design/primitives/Surface'
import { monthAndYear } from '@/lib/dates'
import { MIN_CONTRIBUTIONS_FOR_PROJECTION, type Projection } from '@/domain/projection'

interface ProjectionCardProps {
  projection: Projection
  contributionCount: number
  remainingCents: number
}

/**
 * Com prazo, mostra o ritmo necessário. Sem prazo, mostra uma estimativa
 * gentil. Em nenhum dos dois casos aparece a palavra "atrasado" — o app
 * informa, não cobra.
 */
export function ProjectionCard({ projection, contributionCount, remainingCents }: ProjectionCardProps) {
  if (remainingCents <= 0) return null

  if (!projection) {
    return (
      <Surface elevation="inset" className="p-5">
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          A partir do {MIN_CONTRIBUTIONS_FOR_PROJECTION}º registro, o Songe começa a mostrar o ritmo de vocês.
          {contributionCount > 0 && ` Faltam ${MIN_CONTRIBUTIONS_FOR_PROJECTION - contributionCount}.`}
        </p>
      </Surface>
    )
  }

  if (projection.kind === 'deadline') {
    return (
      <Surface elevation="inset" className="p-5">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <CalendarClock size={17} strokeWidth={1.9} />
          </span>

          <div className="min-w-0 flex-1">
            {projection.overdue ? (
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                O prazo já passou, mas a meta continua de pé. Faltam{' '}
                <Money cents={remainingCents} className="font-medium text-ink" /> para fechar.
              </p>
            ) : (
              <>
                <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                  Para chegar até lá, precisam guardar
                </p>
                <p className="mt-1.5">
                  <Money
                    cents={projection.requiredPerMonth}
                    className="font-display text-[1.5rem] leading-none text-ink"
                  />
                  <span className="ml-1.5 text-[0.9375rem] text-ink-3">por mês</span>
                </p>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-3">
                  {projection.monthsUntilDeadline <= 1
                    ? 'Último mês antes do prazo.'
                    : `Faltam ${projection.monthsUntilDeadline} meses.`}{' '}
                  O ritmo de vocês tem sido de{' '}
                  <Money cents={projection.averagePerMonth} className="text-ink-2" /> por mês
                  {projection.onTrack ? ' — já dá conta.' : '.'}
                </p>
              </>
            )}
          </div>
        </div>
      </Surface>
    )
  }

  return (
    <Surface elevation="inset" className="p-5">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-pine-100 text-pine-600 dark:bg-pine-900/50 dark:text-pine-300">
          <TrendingUp size={17} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] leading-relaxed text-ink-2">
            Se mantiverem o ritmo de{' '}
            <Money cents={projection.averagePerMonth} className="font-medium text-ink" /> por mês, vocês chegam
            lá por volta de
          </p>
          <p className="mt-1.5 font-display text-[1.375rem] leading-tight text-ink first-letter:uppercase">
            {monthAndYear(projection.estimatedDate)}
          </p>
          <p className="mt-2 text-[0.8125rem] text-ink-3">É uma estimativa, não uma promessa.</p>
        </div>
      </div>
    </Surface>
  )
}
