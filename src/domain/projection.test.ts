import { describe, expect, it } from 'vitest'
import { MIN_CONTRIBUTIONS_FOR_PROJECTION, computePace, computeProjection, cumulativeByMonth } from './projection'
import type { Contribution, Goal } from './types'

const NOW = new Date(2026, 8, 15) // 15 de setembro de 2026

function contribution(userId: string, amountCents: number, date: Date): Contribution {
  return {
    id: `${userId}-${date.getTime()}-${amountCents}`,
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

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    coupleId: 'c1',
    title: 'Meta',
    description: null,
    targetCents: 1000000,
    deadline: null,
    cover: null,
    gallery: [],
    status: 'active',
    achievedAt: null,
    createdBy: 'a',
    createdAt: new Date(2026, 3, 1),
    totalCents: 400000,
    perUserCents: { a: 250000, b: 150000 },
    contributionCount: 4,
    ...overrides,
  }
}

/** Um aporte por mês, de abril a setembro. */
const SEIS_MESES = [
  contribution('a', 100000, new Date(2026, 3, 10)),
  contribution('b', 100000, new Date(2026, 4, 10)),
  contribution('a', 100000, new Date(2026, 5, 10)),
  contribution('b', 100000, new Date(2026, 6, 10)),
  contribution('a', 100000, new Date(2026, 7, 10)),
  contribution('b', 100000, new Date(2026, 8, 10)),
]

describe('ritmo', () => {
  it('cala a boca antes do terceiro registro', () => {
    const dois = SEIS_MESES.slice(-2)
    expect(dois.length).toBeLessThan(MIN_CONTRIBUTIONS_FOR_PROJECTION)
    expect(computePace(dois, NOW)).toBeNull()
  })

  it('calcula a média mensal na janela dos últimos seis meses', () => {
    const ritmo = computePace(SEIS_MESES, NOW)
    expect(ritmo).not.toBeNull()
    expect(ritmo!.monthsConsidered).toBe(6)
    expect(ritmo!.averagePerMonth).toBe(100000)
  })

  it('conta os meses parados, não só os meses com aporte', () => {
    // Três aportes em abril e nada depois: a média não pode fingir que
    // foram três meses ativos.
    const tresEmAbril = [
      contribution('a', 30000, new Date(2026, 3, 5)),
      contribution('a', 30000, new Date(2026, 3, 15)),
      contribution('a', 30000, new Date(2026, 3, 25)),
    ]
    const ritmo = computePace(tresEmAbril, NOW)
    expect(ritmo!.monthsConsidered).toBe(6)
    expect(ritmo!.averagePerMonth).toBe(15000)
  })

  it('esquece o que aconteceu antes da janela', () => {
    const antigo = [
      contribution('a', 900000, new Date(2025, 0, 10)),
      ...SEIS_MESES.slice(-3),
    ]
    const ritmo = computePace(antigo, NOW)
    // Os 9 mil de janeiro de 2025 não inflam a média de hoje.
    expect(ritmo!.averagePerMonth).toBeLessThan(200000)
  })
})

describe('projeção sem prazo — a estimativa gentil', () => {
  it('estima a data mantendo o ritmo atual', () => {
    const projecao = computeProjection(
      goal({ targetCents: 1000000, totalCents: 600000, deadline: null }),
      SEIS_MESES,
      NOW,
    )
    expect(projecao?.kind).toBe('gentle')
    if (projecao?.kind !== 'gentle') throw new Error('esperava projeção gentil')

    // Faltam R$ 4.000 no ritmo de R$ 1.000/mês = 4 meses.
    expect(projecao.monthsRemaining).toBe(4)
    expect(projecao.estimatedDate.getMonth()).toBe(0) // janeiro
    expect(projecao.estimatedDate.getFullYear()).toBe(2027)
  })

  it('some quando a meta já foi alcançada', () => {
    const projecao = computeProjection(
      goal({ targetCents: 1000000, totalCents: 1000000 }),
      SEIS_MESES,
      NOW,
    )
    expect(projecao).toBeNull()
  })
})

describe('projeção com prazo — o ritmo necessário', () => {
  it('divide o que falta pelos meses restantes', () => {
    const projecao = computeProjection(
      goal({
        targetCents: 1000000,
        totalCents: 400000,
        deadline: new Date(2026, 14, 15), // março de 2027, 6 meses à frente
      }),
      SEIS_MESES,
      NOW,
    )
    expect(projecao?.kind).toBe('deadline')
    if (projecao?.kind !== 'deadline') throw new Error('esperava projeção com prazo')

    expect(projecao.monthsUntilDeadline).toBe(6)
    // R$ 6.000 em 6 meses = R$ 1.000/mês, arredondado ao real cheio.
    expect(projecao.requiredPerMonth).toBe(100000)
    expect(projecao.onTrack).toBe(true)
  })

  it('arredonda para cima, ao real cheio, para não exibir centavos', () => {
    const projecao = computeProjection(
      goal({ targetCents: 1000000, totalCents: 705000, deadline: new Date(2026, 17, 15) }),
      SEIS_MESES,
      NOW,
    )
    if (projecao?.kind !== 'deadline') throw new Error('esperava projeção com prazo')
    expect(projecao.requiredPerMonth % 100).toBe(0)
  })

  it('avisa que o ritmo não acompanha, sem chamar de atraso', () => {
    const projecao = computeProjection(
      goal({ targetCents: 5000000, totalCents: 400000, deadline: new Date(2026, 10, 15) }),
      SEIS_MESES,
      NOW,
    )
    if (projecao?.kind !== 'deadline') throw new Error('esperava projeção com prazo')
    expect(projecao.onTrack).toBe(false)
    expect(projecao.surplusPerMonth).toBeLessThan(0)
  })

  it('não divide por zero no mês do prazo', () => {
    const projecao = computeProjection(
      goal({ targetCents: 1000000, totalCents: 400000, deadline: NOW }),
      SEIS_MESES,
      NOW,
    )
    if (projecao?.kind !== 'deadline') throw new Error('esperava projeção com prazo')
    expect(Number.isFinite(projecao.requiredPerMonth)).toBe(true)
    expect(projecao.monthsUntilDeadline).toBe(0)
  })

  it('reconhece prazo vencido sem esconder a meta', () => {
    const projecao = computeProjection(
      goal({ targetCents: 1000000, totalCents: 400000, deadline: new Date(2026, 5, 1) }),
      SEIS_MESES,
      NOW,
    )
    if (projecao?.kind !== 'deadline') throw new Error('esperava projeção com prazo')
    expect(projecao.overdue).toBe(true)
  })
})

describe('série acumulada do gráfico', () => {
  it('inclui os meses sem aporte, para o tempo não mentir', () => {
    const pontos = cumulativeByMonth(
      [
        contribution('a', 100000, new Date(2026, 3, 10)),
        contribution('a', 100000, new Date(2026, 8, 10)),
      ],
      ['a', 'b'],
      NOW,
    )
    // Abril a setembro: seis pontos, mesmo com só dois aportes.
    expect(pontos).toHaveLength(6)
  })

  it('acumula sem nunca descer', () => {
    const pontos = cumulativeByMonth(SEIS_MESES, ['a', 'b'], NOW)
    const totais = pontos.map((p) => p.cumulativeTotal)
    expect(totais).toEqual([...totais].sort((x, y) => x - y))
    expect(totais.at(-1)).toBe(600000)
  })

  it('mantém as duas trilhas separadas', () => {
    const pontos = cumulativeByMonth(SEIS_MESES, ['a', 'b'], NOW)
    const ultimo = pontos.at(-1)!
    expect(ultimo.cumulativeByUser.a).toBe(300000)
    expect(ultimo.cumulativeByUser.b).toBe(300000)
  })

  it('devolve lista vazia sem contribuição nenhuma', () => {
    expect(cumulativeByMonth([], ['a', 'b'], NOW)).toEqual([])
  })
})
