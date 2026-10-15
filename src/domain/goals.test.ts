import { describe, expect, it } from 'vitest'
import { coupleTotals, isAchieved, overflowCents, recomputeTotals, remainingCents, splitByMember } from './goals'
import type { Contribution, Goal, User } from './types'

function user(id: string, name: string): User {
  return { id, name, email: `${id}@teste.com`, photoUrl: null, coupleId: 'c1', createdAt: new Date() }
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    coupleId: 'c1',
    title: 'Meta',
    description: null,
    targetCents: 3000000,
    deadline: null,
    cover: null,
    gallery: [],
    status: 'active',
    achievedAt: null,
    createdBy: 'a',
    createdAt: new Date(),
    totalCents: 0,
    perUserCents: {},
    contributionCount: 0,
    ...overrides,
  }
}

function contribution(userId: string, amountCents: number, date = new Date()): Contribution {
  return {
    id: `${userId}-${amountCents}-${date.getTime()}`,
    goalId: 'g1',
    coupleId: 'c1',
    userId,
    amountCents,
    date,
    note: null,
    createdAt: date,
    editedAt: null,
  }
}

const levi = user('a', 'Levi')
const ela = user('b', 'Ela')

describe('o exemplo do briefing', () => {
  // Meta de R$ 30.000: um registra R$ 500, o outro R$ 700.
  const meta = goal({ totalCents: 120000, perUserCents: { a: 50000, b: 70000 } })

  it('soma R$ 1.200 e mostra a divisão de cada um', () => {
    const [primeiro, segundo] = splitByMember(meta, [levi, ela])
    expect(primeiro.cents).toBe(50000)
    expect(segundo.cents).toBe(70000)
    expect(meta.totalCents).toBe(120000)
  })

  it('faltam R$ 28.800', () => {
    expect(remainingCents(meta)).toBe(2880000)
  })

  it('e o progresso é 4%', () => {
    expect((meta.totalCents / meta.targetCents) * 100).toBeCloseTo(4, 5)
  })
})

describe('divisão entre as duas pessoas', () => {
  it('dá a primeira cor a quem aparece primeiro na lista', () => {
    const [primeiro, segundo] = splitByMember(
      { totalCents: 100, perUserCents: { a: 60, b: 40 } },
      [levi, ela],
    )
    expect(primeiro.tone).toBe('mine')
    expect(segundo.tone).toBe('hers')
    expect(primeiro.share).toBeCloseTo(0.6)
  })

  it('não quebra quando ninguém contribuiu ainda', () => {
    const divisao = splitByMember({ totalCents: 0, perUserCents: {} }, [levi, ela])
    expect(divisao.every((entry) => entry.cents === 0 && entry.share === 0)).toBe(true)
  })

  it('funciona antes da parceira entrar', () => {
    const divisao = splitByMember({ totalCents: 500, perUserCents: { a: 500 } }, [levi])
    expect(divisao).toHaveLength(1)
    expect(divisao[0].share).toBe(1)
  })
})

describe('conquista da meta', () => {
  it('considera alcançada ao empatar com o objetivo', () => {
    expect(isAchieved(goal({ targetCents: 1000, totalCents: 1000 }))).toBe(true)
    expect(isAchieved(goal({ targetCents: 1000, totalCents: 999 }))).toBe(false)
  })

  it('mostra o excedente quando passa do objetivo', () => {
    const meta = goal({ targetCents: 1000, totalCents: 1300 })
    expect(overflowCents(meta)).toBe(300)
    // E "faltam" nunca fica negativo.
    expect(remainingCents(meta)).toBe(0)
  })

  it('não declara conquistada uma meta sem objetivo', () => {
    expect(isAchieved(goal({ targetCents: 0, totalCents: 500 }))).toBe(false)
  })
})

describe('recálculo a partir das contribuições', () => {
  it('reconstrói os totais exatamente', () => {
    const totais = recomputeTotals([
      contribution('a', 50000),
      contribution('b', 70000),
      contribution('a', 30000),
    ])
    expect(totais).toEqual({
      totalCents: 150000,
      perUserCents: { a: 80000, b: 70000 },
      contributionCount: 3,
    })
  })

  it('zera quando não há contribuição alguma', () => {
    expect(recomputeTotals([])).toEqual({ totalCents: 0, perUserCents: {}, contributionCount: 0 })
  })
})

describe('totais do casal no dashboard', () => {
  it('soma todas as metas e mantém a divisão por pessoa', () => {
    const totais = coupleTotals([
      goal({ id: 'g1', targetCents: 1000, totalCents: 300, perUserCents: { a: 200, b: 100 } }),
      goal({ id: 'g2', targetCents: 2000, totalCents: 500, perUserCents: { a: 100, b: 400 } }),
    ])
    expect(totais.totalCents).toBe(800)
    expect(totais.targetCents).toBe(3000)
    expect(totais.perUserCents).toEqual({ a: 300, b: 500 })
  })
})
