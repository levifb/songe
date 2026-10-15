import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { repository } from '@/app/repository'
import { useToast } from '@/app/ToastProvider'
import { RepositoryError } from '@/services/repository'
import { Sheet } from '@/design/primitives/Sheet'
import { Button } from '@/design/primitives/Button'
import { DateField, MoneyField, TextAreaField } from '@/design/primitives/Field'
import { fromInputDate, toInputDate } from '@/lib/dates'
import type { Contribution } from '@/domain/types'

interface EditContributionSheetProps {
  contribution: Contribution | null
  open: boolean
  onClose: () => void
}

/**
 * Só abre para o dono do registro — a lista nem torna clicável o que é do
 * outro, e o repositório recusa de novo caso alguém tente por fora.
 */
export function EditContributionSheet({ contribution, open, onClose }: EditContributionSheetProps) {
  const { notify } = useToast()
  const [amountCents, setAmountCents] = useState(0)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contribution) return
    setAmountCents(contribution.amountCents)
    setDate(toInputDate(contribution.date))
    setNote(contribution.note ?? '')
    setError(null)
  }, [contribution])

  if (!contribution) return null

  async function save() {
    if (!contribution || amountCents <= 0) return
    setError(null)
    setSaving(true)
    try {
      await repository.updateContribution(contribution.id, {
        amountCents,
        date: fromInputDate(date),
        note: note.trim() || null,
      })
      notify('Contribuição atualizada.')
      onClose()
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não consegui salvar agora.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!contribution) return
    const confirmed = window.confirm('Apagar esta contribuição? O total da meta será recalculado.')
    if (!confirmed) return

    try {
      await repository.deleteContribution(contribution.id)
      notify('Contribuição apagada.')
      onClose()
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não consegui apagar agora.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar contribuição">
      <div className="px-5 pb-2">
        <h2 className="font-display text-[1.5rem] text-ink">Editar contribuição</h2>
        <p className="mt-1.5 text-[0.875rem] text-ink-2">
          O histórico vai marcar que este registro foi editado.
        </p>
      </div>

      <div className="space-y-6 px-5 pt-6">
        <MoneyField label="Valor" cents={amountCents} onChange={setAmountCents} error={error} />
        <DateField label="Data" value={date} onChange={setDate} />
        <TextAreaField label="Descrição" value={note} onChange={setNote} optional rows={2} />

        <div className="space-y-3 pt-1">
          <Button full size="lg" loading={saving} disabled={amountCents <= 0} onClick={save}>
            Salvar alterações
          </Button>
          <Button full variant="danger" onClick={remove}>
            <Trash2 size={16} strokeWidth={2} />
            Apagar contribuição
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
