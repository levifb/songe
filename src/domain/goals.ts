import type { Cents } from '@/lib/money'
import type { Contribution, Goal, User } from './types'

export interface MemberSplit {
  user: User
  cents: Cents
  /** 0..1 da fatia dentro do total já guardado. */
  share: number
  /** 'mine' e 'hers' são papéis de cor, atribuídos pela ordem no casal. */
  tone: 'mine' | 'hers'
}

/**
 * A divisão entre as duas pessoas. Aparece em todo lugar, então mora aqui
 * e não dentro de um componente.
 */
export function splitByMember(goalOrTotals: { totalCents: Cents; perUserCents: Record<string, Cents> }, members: User[]): MemberSplit[] {
  const total = goalOrTotals.totalCents
  return members.map((user, index) => {
    const cents = goalOrTotals.perUserCents[user.id] ?? 0
    return {
      user,
      cents,
      share: total > 0 ? cents / total : 0,
      tone: index === 0 ? 'mine' : 'hers',
    }
  })
}

export function remainingCents(goal: Goal): Cents {
  return Math.max(goal.targetCents - goal.totalCents, 0)
}

export function overflowCents(goal: Goal): Cents {
  return Math.max(goal.totalCents - goal.targetCents, 0)
}

export function isAchieved(goal: Goal): boolean {
  return goal.totalCents >= goal.targetCents && goal.targetCents > 0
}

/** Totais consolidados do casal, para o topo do dashboard. */
export function coupleTotals(goals: Goal[]): { totalCents: Cents; targetCents: Cents; perUserCents: Record<string, Cents> } {
  const perUserCents: Record<string, Cents> = {}
  let totalCents = 0
  let targetCents = 0

  for (const goal of goals) {
    totalCents += goal.totalCents
    targetCents += goal.targetCents
    for (const [userId, cents] of Object.entries(goal.perUserCents)) {
      perUserCents[userId] = (perUserCents[userId] ?? 0) + cents
    }
  }

  return { totalCents, targetCents, perUserCents }
}

/**
 * Recalcula os agregados a partir dos aportes. Serve como fonte da verdade
 * nos testes e como conserto caso um agregado saia de sincronia.
 */
export function recomputeTotals(contributions: Contribution[]): {
  totalCents: Cents
  perUserCents: Record<string, Cents>
  contributionCount: number
} {
  const perUserCents: Record<string, Cents> = {}
  let totalCents = 0

  for (const c of contributions) {
    totalCents += c.amountCents
    perUserCents[c.userId] = (perUserCents[c.userId] ?? 0) + c.amountCents
  }

  return { totalCents, perUserCents, contributionCount: contributions.length }
}
