import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, Trash2 } from 'lucide-react'
import { repository } from '@/app/repository'
import { useData } from '@/app/DataProvider'
import { useToast } from '@/app/ToastProvider'
import { RepositoryError } from '@/services/repository'
import { Button } from '@/design/primitives/Button'
import { DateField, MoneyField, TextAreaField, TextField } from '@/design/primitives/Field'
import { Photo } from '@/design/primitives/Photo'
import { Rise, Screen, ScreenHeader } from '@/design/primitives/Screen'
import { PhotoPicker } from '@/features/photos/PhotoPicker'
import { fromInputDate, toInputDate } from '@/lib/dates'
import type { PhotoRef } from '@/domain/types'

/** Serve para criar e para editar — os campos e as regras são os mesmos. */
export function GoalFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const { goalId } = useParams()
  const { goalById } = useData()
  const { notify } = useToast()

  const existing = mode === 'edit' && goalId ? goalById(goalId) : undefined

  const [title, setTitle] = useState(existing?.title ?? '')
  const [targetCents, setTargetCents] = useState(existing?.targetCents ?? 0)
  const [deadline, setDeadline] = useState(existing?.deadline ? toInputDate(existing.deadline) : '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [cover, setCover] = useState<PhotoRef | null>(existing?.cover ?? null)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = title.trim().length >= 2 && targetCents > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSaving(true)

    const payload = {
      title,
      description: description.trim() || null,
      targetCents,
      deadline: deadline ? fromInputDate(deadline) : null,
      cover,
    }

    try {
      if (mode === 'edit' && existing) {
        await repository.updateGoal(existing.id, payload)
        notify('Meta atualizada.')
        navigate(`/metas/${existing.id}`, { replace: true })
      } else {
        const goal = await repository.createGoal(payload)
        notify('Meta criada. Agora é registrar.')
        navigate(`/metas/${goal.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não consegui salvar agora.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!existing) return
    const confirmed = window.confirm(
      `Apagar "${existing.title}"? Todas as contribuições registradas nela também somem. Isso não tem volta.`,
    )
    if (!confirmed) return

    await repository.deleteGoal(existing.id)
    notify('Meta apagada.')
    navigate('/metas', { replace: true })
  }

  if (mode === 'edit' && !existing) {
    return (
      <Screen className="pb-10">
        <ScreenHeader back title="Meta não encontrada" subtitle="Ela pode ter sido apagada." />
      </Screen>
    )
  }

  return (
    <Screen className="pb-10">
      <ScreenHeader
        back
        title={mode === 'edit' ? 'Editar meta' : 'Nova meta'}
        subtitle={mode === 'edit' ? undefined : 'O nome e o valor bastam. O resto pode vir depois.'}
      />

      <form onSubmit={onSubmit}>
        <Rise className="px-5 pt-5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="block w-full overflow-hidden rounded-lg ring-1 ring-line-soft transition-shadow hover:shadow-lift"
            aria-label="Escolher foto de capa"
          >
            <Photo photo={cover} ratio="3/2" overlay={cover ? 'soft' : 'none'} rounded="rounded-none">
              <div className="flex size-full items-end justify-between gap-3 p-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-alpine-950/55 px-3.5 py-2 text-[0.8125rem] font-medium text-white backdrop-blur-sm">
                  <ImagePlus size={15} strokeWidth={2} />
                  {cover ? 'Trocar capa' : 'Escolher capa'}
                </span>
                <span className="rounded-full bg-alpine-950/40 px-2.5 py-1 text-[0.6875rem] text-white/80 backdrop-blur-sm">
                  3:2
                </span>
              </div>
            </Photo>
          </button>
        </Rise>

        <Rise className="space-y-5 px-5 pt-7">
          <TextField
            label="Nome da meta"
            value={title}
            onChange={setTitle}
            placeholder="Como vocês chamam esse plano"
            maxLength={60}
          />

          <MoneyField label="Objetivo" cents={targetCents} onChange={setTargetCents} />

          <DateField
            label="Prazo"
            value={deadline}
            onChange={setDeadline}
            optional
            min={toInputDate(new Date())}
            hint="Com prazo, o Songe mostra quanto precisa entrar por mês."
          />

          <TextAreaField
            label="Descrição"
            value={description}
            onChange={setDescription}
            optional
            placeholder="Um lembrete de por que isso importa para vocês."
          />

          {error && <p role="alert" className="text-[0.875rem] text-danger">{error}</p>}

          <Button type="submit" full size="lg" loading={saving} disabled={!canSubmit}>
            {mode === 'edit' ? 'Salvar alterações' : 'Criar meta'}
          </Button>

          {mode === 'edit' && (
            <Button full variant="danger" onClick={onDelete}>
              <Trash2 size={16} strokeWidth={2} />
              Apagar esta meta
            </Button>
          )}
        </Rise>
      </form>

      <PhotoPicker open={pickerOpen} onClose={() => setPickerOpen(false)} selected={cover} onSelect={setCover} />
    </Screen>
  )
}
