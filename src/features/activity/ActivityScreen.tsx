import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flag, PartyPopper, UserPlus, Wallet } from 'lucide-react'
import { repository } from '@/app/repository'
import { useData } from '@/app/DataProvider'
import { useSession } from '@/app/SessionProvider'
import { Money } from '@/design/primitives/Money'
import { Rise, Screen, ScreenHeader } from '@/design/primitives/Screen'
import { relativeDay } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'
import type { Activity } from '@/domain/types'

const ICONS = {
  contribution: Wallet,
  goal_created: Flag,
  goal_achieved: PartyPopper,
  partner_joined: UserPlus,
} as const

export function ActivityScreen() {
  const { user, couple, members } = useSession()
  const { activities } = useData()

  // Entrar na tela já conta como ler: o ponto na aba some ao sair.
  useEffect(() => {
    if (!couple) return
    const timer = setTimeout(() => void repository.markActivitiesRead(couple.id).catch(() => {}), 700)
    return () => clearTimeout(timer)
  }, [couple, activities.length])

  if (!user) return null

  return (
    <Screen className="pb-8">
      <ScreenHeader title="Novidades" subtitle="Tudo o que aconteceu por aqui, dos dois lados." />

      {activities.length === 0 ? (
        <Rise className="px-5 pt-16 text-center">
          <p className="font-display text-[1.375rem] leading-snug text-ink">Ainda está tudo em silêncio</p>
          <p className="mx-auto mt-3 max-w-[20rem] text-[0.9375rem] leading-relaxed text-ink-2">
            Assim que um de vocês registrar algo, aparece aqui.
          </p>
        </Rise>
      ) : (
        <Rise className="px-5 pt-4">
          <ul className="space-y-1">
            {activities.map((activity, index) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                index={index}
                unread={!activity.readBy.includes(user.id)}
                actorName={
                  activity.actorId === user.id
                    ? 'Você'
                    : (members.find((m) => m.id === activity.actorId)?.name ?? 'Alguém')
                }
              />
            ))}
          </ul>
        </Rise>
      )}
    </Screen>
  )
}

interface ActivityRowProps {
  activity: Activity
  actorName: string
  unread: boolean
  index: number
}

function ActivityRow({ activity, actorName, unread, index }: ActivityRowProps) {
  const Icon = ICONS[activity.type]

  const content = (
    <div
      className={cn(
        'flex items-start gap-3.5 rounded-lg px-3 py-3.5 transition-colors',
        unread ? 'bg-accent-soft/45' : 'hover:bg-surface-2',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full',
          activity.type === 'goal_achieved'
            ? 'bg-pine-100 text-pine-600 dark:bg-pine-900/50 dark:text-pine-300'
            : 'bg-surface-2 text-ink-2 dark:bg-alpine-800',
        )}
      >
        <Icon size={16} strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] leading-snug text-ink">
          {activity.type === 'contribution' && (
            <>
              <span className="font-medium">{actorName}</span> registrou{' '}
              <Money cents={activity.amountCents ?? 0} className="font-medium" /> em{' '}
              <span className="text-ink-2">{activity.goalTitle}</span>
            </>
          )}
          {activity.type === 'goal_created' && (
            <>
              <span className="font-medium">{actorName}</span> criou a meta{' '}
              <span className="text-ink-2">{activity.goalTitle}</span>
            </>
          )}
          {activity.type === 'goal_achieved' && (
            <>
              <span className="text-ink-2">{activity.goalTitle}</span> chegou ao objetivo
            </>
          )}
          {activity.type === 'partner_joined' && (
            <>
              <span className="font-medium">{actorName}</span> entrou na parceria
            </>
          )}
        </p>
        <p className="mt-1 text-[0.8125rem] text-ink-3">{relativeDay(activity.createdAt)}</p>
      </div>

      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="não lida" />}
    </div>
  )

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: Math.min(index * 0.04, 0.3) }}
    >
      {activity.goalId ? <Link to={`/metas/${activity.goalId}`}>{content}</Link> : content}
    </motion.li>
  )
}
