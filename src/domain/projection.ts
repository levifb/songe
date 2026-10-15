import type { Cents } from '@/lib/money'
import { addMonths, monthKey, monthsBetween } from '@/lib/dates'
import type { Contribution, Goal } from './types'
import { remainingCents } from './goals'

/** Abaixo disso a média é ruído, e um número mentiroso é pior que nenhum. */
export const MIN_CONTRIBUTIONS_FOR_PROJECTION = 3

/** Janela de análise: o ritmo do último semestre, não o da vida inteira. */
const WINDOW_MONTHS = 6

export interface Pace {
  /** Média mensal real dos últimos meses. */
  averagePerMonth: Cents
  monthsConsidered: number
}

export interface GentleProjection {
  kind: 'gentle'
  averagePerMonth: Cents
  monthsRemaining: number
  estimatedDate: Date
}

export interface DeadlineProjection {
  kind: 'deadline'
  /** O que a meta pede por mês daqui até o prazo. */
  requiredPerMonth: Cents
  averagePerMonth: Cents
  monthsUntilDeadline: number
  /** Positivo = o ritmo atual já dá conta. */
  surplusPerMonth: Cents
  onTrack: boolean
  overdue: boolean
}

export type Projection = GentleProjection | DeadlineProjection | null

export function computePace(contributions: Contribution[], now = new Date()): Pace | null {
  if (contributions.length < MIN_CONTRIBUTIONS_FOR_PROJECTION) return null

  const windowStart = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -(WINDOW_MONTHS - 1))
  const inWindow = contributions.filter((c) => c.date >= windowStart)
  if (inWindow.length === 0) return null

  const earliest = inWindow.reduce((min, c) => (c.date < min ? c.date : min), inWindow[0].date)
  const monthsConsidered = Math.max(1, Math.min(WINDOW_MONTHS, monthsBetween(earliest, now) + 1))
  const sum = inWindow.reduce((acc, c) => acc + c.amountCents, 0)

  return { averagePerMonth: Math.round(sum / monthsConsidered), monthsConsidered }
}

export function computeProjection(goal: Goal, contributions: Contribution[], now = new Date()): Projection {
  const pace = computePace(contributions, now)
  if (!pace) return null

  const remaining = remainingCents(goal)

  if (goal.deadline) {
    const monthsUntilDeadline = monthsBetween(now, goal.deadline)
    const overdue = monthsUntilDeadline < 0
    const usableMonths = Math.max(1, monthsUntilDeadline)
    // Arredondado para o real cheio acima: "R$ 328" se lê melhor que "R$ 327,78".
    const requiredPerMonth = remaining > 0 ? Math.ceil(remaining / usableMonths / 100) * 100 : 0

    return {
      kind: 'deadline',
      requiredPerMonth,
      averagePerMonth: pace.averagePerMonth,
      monthsUntilDeadline,
      surplusPerMonth: pace.averagePerMonth - requiredPerMonth,
      onTrack: pace.averagePerMonth >= requiredPerMonth,
      overdue,
    }
  }

  if (remaining <= 0 || pace.averagePerMonth <= 0) return null

  const monthsRemaining = Math.ceil(remaining / pace.averagePerMonth)
  return {
    kind: 'gentle',
    averagePerMonth: pace.averagePerMonth,
    monthsRemaining,
    estimatedDate: addMonths(now, monthsRemaining),
  }
}

export interface MonthPoint {
  key: string
  date: Date
  /** Acumulado ao fim do mês, por pessoa. */
  cumulativeByUser: Record<string, Cents>
  cumulativeTotal: Cents
}

/**
 * Série acumulada mês a mês — a encosta que o gráfico desenha.
 * Meses sem aporte continuam na série, senão a curva mente sobre o tempo.
 */
export function cumulativeByMonth(contributions: Contribution[], memberIds: string[], now = new Date()): MonthPoint[] {
  if (contributions.length === 0) return []

  const sorted = [...contributions].sort((a, b) => a.date.getTime() - b.date.getTime())
  const first = sorted[0].date
  const start = new Date(first.getFullYear(), first.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const span = Math.max(0, monthsBetween(start, end))

  const byMonth = new Map<string, Record<string, Cents>>()
  for (const c of sorted) {
    const key = monthKey(c.date)
    const bucket = byMonth.get(key) ?? {}
    bucket[c.userId] = (bucket[c.userId] ?? 0) + c.amountCents
    byMonth.set(key, bucket)
  }

  const running: Record<string, Cents> = Object.fromEntries(memberIds.map((id) => [id, 0]))
  const points: MonthPoint[] = []

  for (let i = 0; i <= span; i++) {
    const date = addMonths(start, i)
    const key = monthKey(date)
    const bucket = byMonth.get(key)
    if (bucket) {
      for (const [userId, cents] of Object.entries(bucket)) {
        running[userId] = (running[userId] ?? 0) + cents
      }
    }
    points.push({
      key,
      date,
      cumulativeByUser: { ...running },
      cumulativeTotal: Object.values(running).reduce((a, b) => a + b, 0),
    })
  }

  return points
}
