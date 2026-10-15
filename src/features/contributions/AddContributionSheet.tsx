import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { repository } from '@/app/repository'
import { useData } from '@/app/DataProvider'
import { useToast } from '@/app/ToastProvider'
import { RepositoryError } from '@/services/repository'
import { Sheet } from '@/design/primitives/Sheet'
import { Button } from '@/design/primitives/Button'
import { DateField, MoneyField, TextAreaField } from '@/design/primitives/Field'
import { Celebration } from '@/design/primitives/Celebration'
import { Money } from '@/design/primitives/Money'
import { fromInputDate, toInputDate } from '@/lib/dates'
import { formatCentsCompact, formatPercent, progressPercent } from '@/lib/money'
import { notifyPartner } from '@/services/push'
import { useSession } from '@/app/SessionProvider'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'

function firstName(name: string | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'Alguém'
}

/**
 * A folha do botão "+". Abre por cima da tela atual e some ao terminar.
 * Se a meta fechar com este aporte, a celebração acontece antes de fechar.
 */
export function AddContributionSheet() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeGoals, goalById } = useData()
  const { notify } = useToast()
  const { user, partner } = useSession()

  const preselected = (location.state as { goalId?: string } | null)?.goalId
  const [goalId, setGoalId] = useState(preselected ?? activeGoals[0]?.id ?? '')
  const [amountCents, setAmountCents] = useState(0)
  const [date, setDate] = useState(toInputDate(new Date()))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    if (!goalId && activeGoals[0]) setGoalId(activeGoals[0].id)
  }, [activeGoals, goalId])

  const goal = goalById(goalId)
  const canSubmit = Boolean(goalId) && amountCents > 0
  const willAchieve = goal ? goal.totalCents + amountCents >= goal.targetCents : false

  function close() {
    navigate(-1)
  }

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setSaving(true)
    try {
      await repository.addContribution({
        goalId,
        amountCents,
        date: fromInputDate(date),
        note: note.trim() || null,
      })

      // O aviso sai depois do registro estar salvo, e nunca o atrapalha.
      if (partner && goal) {
        const nextTotal = goal.totalCents + amountCents
        void notifyPartner({
          title: '💰 Nova contribuição',
          body: willAchieve
            ? `${firstName(user?.name)} fechou a meta ${goal.title}. Vocês chegaram lá!`
            : `${firstName(user?.name)} registrou ${formatCentsCompact(amountCents)} em ${goal.title}. ` +
              `Vocês já estão em ${formatPercent(progressPercent(nextTotal, goal.targetCents))}.`,
          url: `/metas/${goal.id}`,
        })
      }

      if (willAchieve) {
        setCelebrating(true)
        notify(`Meta alcançada. ${goal?.title ?? ''}`.trim())
        // Deixa o confete cair antes de tirar a folha da tela.
        setTimeout(close, 1600)
      } else {
        notify(`${formatCentsCompact(amountCents)} registrados.`)
        close()
      }
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não consegui registrar agora.')
      setSaving(false)
    }
  }

  return (
    <>
      <Celebration active={celebrating} />

      <Sheet open onClose={close} title="Registrar contribuição">
        <div className="px-5 pb-2">
          <h2 className="font-display text-[1.5rem] text-ink">Registrar contribuição</h2>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
            Isto só anota o que você separou. O dinheiro continua na sua conta.
          </p>
        </div>

        <div className="space-y-6 px-5 pt-6">
          <div>
            <p className="px-0.5 pb-2.5 text-[0.8125rem] font-medium text-ink-2">Para qual meta</p>
            <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
              {activeGoals.map((option) => {
                const selected = option.id === goalId
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={spring.snappy}
                    onClick={() => setGoalId(option.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 transition-colors',
                      selected
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                    )}
                  >
                    {option.cover ? (
                      <img
                        src={option.cover.src}
                        alt=""
                        className="size-7 shrink-0 rounded-full object-cover"
                        style={{
                          objectPosition: `${option.cover.focalX * 100}% ${option.cover.focalY * 100}%`,
                        }}
                      />
                    ) : (
                      <span className="size-7 shrink-0 rounded-full bg-alpine-200 dark:bg-alpine-700" />
                    )}
                    <span className="max-w-[11rem] truncate text-[0.9375rem] font-medium">{option.title}</span>
                    {selected && <Check size={15} strokeWidth={2.6} className="shrink-0 text-accent" />}
                  </motion.button>
                )
              })}
            </div>
          </div>

          <MoneyField label="Valor" cents={amountCents} onChange={setAmountCents} autoFocus error={error} />

          <DateField label="Data" value={date} onChange={setDate} />

          <TextAreaField
            label="Descrição"
            value={note}
            onChange={setNote}
            optional
            rows={2}
            placeholder="Economia de setembro, parte do 13º…"
          />

          {goal && amountCents > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.soft}
              className="rounded-md bg-surface-2 px-4 py-3.5 text-[0.875rem] leading-relaxed text-ink-2"
            >
              {willAchieve ? (
                <>Com este registro, <span className="font-medium text-ink">{goal.title}</span> fecha o objetivo.</>
              ) : (
                <>
                  <span className="font-medium text-ink">{goal.title}</span> passa a ter{' '}
                  <Money cents={goal.totalCents + amountCents} className="font-medium text-ink" /> de{' '}
                  <Money cents={goal.targetCents} />.
                </>
              )}
            </motion.p>
          )}

          <div className="pt-1">
            <Button full size="lg" loading={saving} disabled={!canSubmit} onClick={submit}>
              Registrar contribuição
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
