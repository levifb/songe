import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useData } from '@/app/DataProvider'
import { useSession } from '@/app/SessionProvider'
import { Button } from '@/design/primitives/Button'
import { Rise, Screen, ScreenHeader, SectionTitle } from '@/design/primitives/Screen'
import { GoalCard } from './GoalCard'
import { EmptyGoals } from './EmptyGoals'

export function GoalsScreen() {
  const navigate = useNavigate()
  const { members } = useSession()
  const { activeGoals, achievedGoals, goals } = useData()

  return (
    <Screen className="pb-8">
      <ScreenHeader
        title="Nossas metas"
        subtitle={goals.length > 0 ? `${goals.length} ${goals.length === 1 ? 'plano' : 'planos'} em curso.` : undefined}
        action={
          goals.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => navigate('/metas/nova')}>
              <Plus size={16} strokeWidth={2.3} />
              Nova
            </Button>
          ) : undefined
        }
      />

      {goals.length === 0 ? (
        <Rise className="pt-6">
          <EmptyGoals />
        </Rise>
      ) : (
        <>
          <div className="space-y-5 px-5 pt-5">
            {activeGoals.map((goal) => (
              <Rise key={goal.id}>
                <GoalCard goal={goal} members={members} />
              </Rise>
            ))}
          </div>

          {achievedGoals.length > 0 && (
            <section className="pt-11">
              <Rise>
                <SectionTitle>Conquistadas</SectionTitle>
              </Rise>
              <div className="space-y-5 px-5">
                {achievedGoals.map((goal) => (
                  <Rise key={goal.id}>
                    <GoalCard goal={goal} members={members} />
                  </Rise>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Screen>
  )
}
