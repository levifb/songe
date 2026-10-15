import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Settings, UserPlus, Users } from 'lucide-react'
import { repository } from '@/app/repository'
import { useData } from '@/app/DataProvider'
import { useSession } from '@/app/SessionProvider'
import { useToast } from '@/app/ToastProvider'
import { Avatar } from '@/design/primitives/Avatar'
import { Button } from '@/design/primitives/Button'
import { Money } from '@/design/primitives/Money'
import { TextField } from '@/design/primitives/Field'
import { Rise, Screen, ScreenHeader } from '@/design/primitives/Screen'
import { Sheet } from '@/design/primitives/Sheet'
import { Surface } from '@/design/primitives/Surface'
import { monthAndYear } from '@/lib/dates'
import { cn } from '@/lib/cn'

export function ProfileScreen() {
  const navigate = useNavigate()
  const { user, couple, partner, refresh } = useSession()
  const { totals, goals, contributions } = useData()
  const { notify } = useToast()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const myContributions = contributions.filter((c) => c.userId === user.id).length

  async function saveName() {
    setSaving(true)
    try {
      await repository.updateProfile({ name })
      await refresh()
      notify('Nome atualizado.')
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await repository.signOut()
    navigate('/bem-vindo', { replace: true })
  }

  return (
    <Screen className="pb-8">
      <ScreenHeader title="Nós" />

      <Rise className="px-5 pt-3">
        <Surface elevation="raised" className="overflow-hidden">
          <div className="bg-radial-[at_50%_-10%] from-ember-50 to-surface px-6 pb-7 pt-8 text-center dark:from-ember-900/20 dark:to-surface">
            <div className="flex items-center justify-center gap-3">
              <Avatar name={user.name} photoUrl={user.photoUrl} size="lg" tone="mine" />
              {partner ? (
                <Avatar name={partner.name} photoUrl={partner.photoUrl} size="lg" tone="hers" className="-ml-6" />
              ) : (
                <Link
                  to="/conectar"
                  aria-label="Convidar parceira"
                  className="-ml-6 grid size-20 place-items-center rounded-full border-2 border-dashed border-line bg-surface text-ink-3 transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <UserPlus size={22} strokeWidth={1.8} />
                </Link>
              )}
            </div>

            <p className="mt-5 font-display text-[1.5rem] leading-snug text-ink">
              {partner ? (
                <>
                  {user.name} <span className="text-ink-3">e</span> {partner.name}
                </>
              ) : (
                user.name
              )}
            </p>

            {couple && (
              <p className="mt-1.5 text-[0.875rem] text-ink-3 first-letter:uppercase">
                {partner ? 'Juntos aqui desde' : 'Por aqui desde'} {monthAndYear(couple.createdAt)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft">
            <Stat label="Guardado" value={<Money cents={totals.totalCents} className="text-[1.0625rem]" />} />
            <Stat label="Metas" value={String(goals.length)} />
            <Stat label="Seus registros" value={String(myContributions)} />
          </div>
        </Surface>
      </Rise>

      <Rise className="px-5 pt-7">
        <nav className="overflow-hidden rounded-lg border border-line-soft bg-surface">
          <Row icon={Users} label={partner ? 'Nossa parceria' : 'Convidar parceira'} to="/conectar" />
          <Row icon={Settings} label="Ajustes" to="/nos/ajustes" />
        </nav>
      </Rise>

      <Rise className="px-5 pt-5">
        <button
          type="button"
          onClick={() => {
            setName(user.name)
            setEditing(true)
          }}
          className="w-full rounded-lg border border-line-soft bg-surface px-4 py-4 text-left text-[0.9375rem] text-ink transition-colors hover:bg-surface-2"
        >
          Editar meu nome
        </button>
      </Rise>

      <Rise className="px-5 pt-8">
        <Button full variant="ghost" onClick={signOut} className="text-ink-2">
          <LogOut size={17} strokeWidth={1.9} />
          Sair da conta
        </Button>
      </Rise>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Editar nome">
        <div className="space-y-6 px-5 pb-4 pt-2">
          <h2 className="font-display text-[1.5rem] text-ink">Editar meu nome</h2>
          <TextField label="Como você quer ser chamado" value={name} onChange={setName} maxLength={40} />
          <Button full size="lg" loading={saving} disabled={name.trim().length < 2} onClick={saveName}>
            Salvar
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-2 py-4 text-center">
      <p className="numeric font-display text-[1.0625rem] leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.06em] text-ink-3">{label}</p>
    </div>
  )
}

function Row({ icon: Icon, label, to }: { icon: typeof Users; label: string; to: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-surface-2',
        'border-b border-line-soft last:border-b-0',
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 dark:bg-alpine-800">
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <span className="flex-1 text-[0.9375rem] text-ink">{label}</span>
      <ChevronRight size={17} className="shrink-0 text-ink-3" />
    </Link>
  )
}
