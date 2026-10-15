/**
 * Dinheiro no Songe é sempre um inteiro de centavos.
 * R$ 500,00 vive na memória como 50000 e nunca como 500.0.
 * Ponto flutuante só aparece na hora de desenhar uma barra de progresso.
 */
export type Cents = number

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const brlWhole = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 })

export function formatCents(cents: Cents): string {
  return brl.format(cents / 100)
}

/** Para títulos grandes, onde ",00" só polui. Centavos reais são preservados. */
export function formatCentsCompact(cents: Cents): string {
  return cents % 100 === 0 ? brlWhole.format(cents / 100) : brl.format(cents / 100)
}

/** Sem o símbolo — quando o "R$" já está desenhado ao lado, menor. */
export function formatCentsBare(cents: Cents): string {
  return decimal.format(cents / 100)
}

/**
 * Entrada mascarada: o usuário digita dígitos e eles preenchem da direita
 * para a esquerda, como numa maquininha. Nunca dá para digitar vírgula errada.
 */
export function digitsToCents(raw: string): Cents {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  return digits ? Number.parseInt(digits, 10) : 0
}

export function centsToMaskedInput(cents: Cents): string {
  if (!cents) return ''
  return decimal.format(cents / 100)
}

/** Progresso em 0..1, sem estourar acima de 1 mesmo com aporte além da meta. */
export function progressRatio(current: Cents, target: Cents): number {
  if (target <= 0) return 0
  return Math.min(current / target, 1)
}

/** O número exibido — este pode passar de 100%. */
export function progressPercent(current: Cents, target: Cents): number {
  if (target <= 0) return 0
  return (current / target) * 100
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}
