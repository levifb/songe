import { describe, expect, it } from 'vitest'
import {
  centsToMaskedInput,
  digitsToCents,
  formatCents,
  formatCentsCompact,
  formatPercent,
  progressPercent,
  progressRatio,
} from './money'

describe('dinheiro em centavos', () => {
  it('formata em pt-BR com o símbolo brasileiro', () => {
    //   é o espaço não separável que o Intl usa entre R$ e o número.
    expect(formatCents(50000)).toBe('R$ 500,00')
    expect(formatCents(123456)).toBe('R$ 1.234,56')
    expect(formatCents(0)).toBe('R$ 0,00')
  })

  it('esconde os centavos só quando eles são zero', () => {
    expect(formatCentsCompact(50000)).toBe('R$ 500')
    expect(formatCentsCompact(50050)).toBe('R$ 500,50')
  })

  it('nunca perde um centavo por arredondamento', () => {
    // O erro clássico: 0.1 + 0.2 !== 0.3 em ponto flutuante.
    const parcelas = [1010, 2020, 3033]
    expect(parcelas.reduce((a, b) => a + b, 0)).toBe(6063)
    expect(formatCents(6063)).toBe('R$ 60,63')
  })
})

describe('máscara de entrada', () => {
  it('preenche da direita para a esquerda, como uma maquininha', () => {
    expect(digitsToCents('5')).toBe(5)
    expect(digitsToCents('50')).toBe(50)
    expect(digitsToCents('500')).toBe(500)
    expect(digitsToCents('50000')).toBe(50000)
  })

  it('ignora tudo que não é dígito', () => {
    expect(digitsToCents('R$ 1.234,56')).toBe(123456)
    expect(digitsToCents('abc')).toBe(0)
    expect(digitsToCents('')).toBe(0)
  })

  it('trunca valores absurdos em vez de estourar', () => {
    expect(digitsToCents('9'.repeat(30))).toBe(99999999999)
  })

  it('vai e volta sem alterar o valor', () => {
    expect(digitsToCents(centsToMaskedInput(123456))).toBe(123456)
  })

  it('mostra campo vazio quando não há valor, e não "0,00"', () => {
    expect(centsToMaskedInput(0)).toBe('')
  })
})

describe('progresso', () => {
  it('trava a barra em 100% mesmo com aporte além da meta', () => {
    expect(progressRatio(150, 100)).toBe(1)
    expect(progressRatio(50, 100)).toBe(0.5)
  })

  it('mas o número exibido passa de 100%, porque isso é verdade', () => {
    expect(progressPercent(150, 100)).toBe(150)
  })

  it('não divide por zero quando a meta ainda não tem objetivo', () => {
    expect(progressRatio(100, 0)).toBe(0)
    expect(progressPercent(100, 0)).toBe(0)
  })

  it('arredonda a porcentagem para uma casa, com vírgula', () => {
    expect(formatPercent(41.66666)).toBe('41,7%')
    expect(formatPercent(4)).toBe('4%')
  })
})
