import { Money } from '@/design/primitives/Money'
import type { MemberSplit } from '@/domain/goals'
import { cn } from '@/lib/cn'

interface SplitRowProps {
  split: MemberSplit[]
  currentUserId: string
  className?: string
  /** Sobre foto ou fundo escuro, o texto precisa clarear. */
  onDark?: boolean
}

/**
 * "Você R$ 500 · Ela R$ 700". Aparece em todo lugar e nunca vira cobrança:
 * mostra a divisão, jamais uma dívida.
 */
export function SplitRow({ split, currentUserId, className, onDark = false }: SplitRowProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      {split.map((entry) => (
        <div key={entry.user.id} className="flex items-center gap-2">
          <span
            className={cn('size-2 shrink-0 rounded-full', entry.tone === 'mine' ? 'bg-mine' : 'bg-hers')}
            aria-hidden
          />
          <span className={cn('text-[0.875rem]', onDark ? 'text-white/65' : 'text-ink-3')}>
            {entry.user.id === currentUserId ? 'Você' : entry.user.name}
          </span>
          <Money
            cents={entry.cents}
            className={cn('text-[0.875rem] font-medium', onDark ? 'text-white' : 'text-ink')}
          />
        </div>
      ))}
    </div>
  )
}
