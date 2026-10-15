const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** "08" + "SET" — o formato da timeline, onde o dia vem antes do mês. */
export function dayAndMonth(date: Date): { day: string; month: string } {
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS_SHORT[date.getMonth()],
  }
}

export function monthAndYear(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`
}

export function formatFullDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')} de ${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`
}

export function toInputDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromInputDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Chave de agrupamento mensal, para a timeline e para o gráfico. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/** "hoje", "ontem", "há 3 dias", "12 de março" — para o feed de novidades. */
export function relativeDay(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? 'há 1 semana' : `há ${weeks} semanas`
  }
  return `${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`
}
