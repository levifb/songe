import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { repository } from './repository'
import { useSession } from './SessionProvider'
import { coupleTotals } from '@/domain/goals'
import type { Activity, Contribution, Goal } from '@/domain/types'

interface DataValue {
  goals: Goal[]
  activeGoals: Goal[]
  achievedGoals: Goal[]
  contributions: Contribution[]
  activities: Activity[]
  /** Novidades que a pessoa ainda não viu — alimenta o ponto na aba. */
  unreadCount: number
  totals: ReturnType<typeof coupleTotals>
  contributionsOf: (goalId: string) => Contribution[]
  goalById: (goalId: string) => Goal | undefined
  ready: boolean
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, couple } = useSession()
  const [goals, setGoals] = useState<Goal[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!couple) {
      setGoals([])
      setContributions([])
      setActivities([])
      setReady(true)
      return
    }

    setReady(false)
    const unsubscribers = [
      repository.subscribeGoals(couple.id, (next) => {
        setGoals(next)
        setReady(true)
      }),
      repository.subscribeContributions(couple.id, setContributions),
      repository.subscribeActivities(couple.id, setActivities),
    ]
    return () => unsubscribers.forEach((stop) => stop())
  }, [couple])

  const value = useMemo<DataValue>(() => {
    const byGoal = new Map<string, Contribution[]>()
    for (const item of contributions) {
      const bucket = byGoal.get(item.goalId)
      if (bucket) bucket.push(item)
      else byGoal.set(item.goalId, [item])
    }

    const activeGoals = goals.filter((g) => g.status === 'active')
    const achievedGoals = goals
      .filter((g) => g.status === 'achieved')
      .sort((a, b) => (b.achievedAt?.getTime() ?? 0) - (a.achievedAt?.getTime() ?? 0))

    return {
      goals,
      activeGoals,
      achievedGoals,
      contributions,
      activities,
      unreadCount: user ? activities.filter((a) => !a.readBy.includes(user.id)).length : 0,
      totals: coupleTotals(goals),
      contributionsOf: (goalId) => byGoal.get(goalId) ?? [],
      goalById: (goalId) => goals.find((g) => g.id === goalId),
      ready,
    }
  }, [goals, contributions, activities, user, ready])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataValue {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData precisa estar dentro de DataProvider')
  return value
}
