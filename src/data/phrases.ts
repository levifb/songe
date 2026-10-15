/**
 * Uma frase por estado, escolhida pelo momento do casal — não sorteada.
 * Frase aleatória vira ruído; frase que reconhece onde vocês estão vira companhia.
 */
export function greeting(name: string, now = new Date()): string {
  const hour = now.getHours()
  const first = name.trim().split(/\s+/)[0] || ''
  if (hour < 5) return `Boa madrugada, ${first}`
  if (hour < 12) return `Bom dia, ${first}`
  if (hour < 18) return `Boa tarde, ${first}`
  return `Boa noite, ${first}`
}

interface PhraseContext {
  hasPartner: boolean
  goalCount: number
  totalCents: number
  targetCents: number
  contributedThisMonth: boolean
  justAchieved: boolean
}

export function dashboardPhrase(context: PhraseContext): string {
  if (context.justAchieved) return 'Uma meta saiu do papel. Vale comemorar.'
  if (!context.hasPartner) return 'Assim que ela entrar, tudo isto passa a ser de vocês dois.'
  if (context.goalCount === 0) return 'Ainda sem metas — e é exatamente daqui que tudo começa.'
  if (context.totalCents === 0) return 'O primeiro registro é sempre o mais bonito.'

  const ratio = context.targetCents > 0 ? context.totalCents / context.targetCents : 0
  if (ratio >= 0.9) return 'Está logo ali. Dá para ver daqui.'
  if (ratio >= 0.5) return 'Mais da metade do caminho já ficou para trás.'
  if (ratio >= 0.25) return 'O que era plano já virou quantia.'
  if (context.contributedThisMonth) return 'Este mês já tem a marca de vocês.'
  return 'Devagar também é uma forma de chegar.'
}
