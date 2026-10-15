import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { repository } from '@/app/repository'
import { useSession } from '@/app/SessionProvider'
import { useToast } from '@/app/ToastProvider'
import { RepositoryError } from '@/services/repository'
import { Button } from '@/design/primitives/Button'
import { Rise, Screen, ScreenHeader } from '@/design/primitives/Screen'
import { Surface } from '@/design/primitives/Surface'
import type { Invite } from '@/domain/types'
import { spring } from '@/design/motion'

export function ConnectPartnerScreen() {
  const navigate = useNavigate()
  const { user, couple, partner, refresh } = useSession()
  const { notify } = useToast()

  const [invite, setInvite] = useState<Invite | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!couple) return
    void repository.getActiveInvite(couple.id).then(setInvite).catch(() => setInvite(null))
  }, [couple])

  async function copyCode() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      notify('Não consegui copiar. Anote o código manualmente.', 'error')
    }
  }

  async function shareCode() {
    if (!invite) return
    const text = `Entra comigo no Songe — nosso app pra acompanhar o que a gente tá guardando. Meu código é ${invite.code}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        /* A pessoa cancelou o compartilhamento; nada a fazer. */
      }
    } else {
      await copyCode()
    }
  }

  async function regenerate() {
    if (!couple) return
    setInvite(await repository.regenerateInvite(couple.id))
    notify('Código novo gerado. O anterior deixou de valer.')
  }

  async function join() {
    setError(null)
    setJoining(true)
    try {
      await repository.redeemInvite(code)
      await refresh()
      notify('Prontinho. Vocês estão conectados.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não foi possível usar este código.')
    } finally {
      setJoining(false)
    }
  }

  if (partner) {
    return (
      <Screen className="pb-10">
        <ScreenHeader back title="Vocês dois" />
        <Rise className="px-5 pt-4">
          <Surface elevation="raised" className="p-6 text-center">
            <p className="font-display text-2xl leading-snug text-ink">
              {user?.name} <span className="text-ink-3">e</span> {partner.name}
            </p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
              A parceria de vocês já está formada. Tudo o que for registrado aparece para os dois.
            </p>
          </Surface>
        </Rise>
      </Screen>
    )
  }

  return (
    <Screen className="pb-12">
      <ScreenHeader
        back
        title="Chame a outra metade"
        subtitle="Mande o código abaixo. Assim que ela entrar, tudo o que você já registrou aparece para as duas pessoas."
      />

      <Rise className="px-5 pt-6">
        <Surface elevation="raised" className="overflow-hidden">
          <div className="bg-radial-[at_50%_0%] from-ember-50 to-surface px-6 pb-7 pt-8 text-center dark:from-ember-900/25 dark:to-surface">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-ink-3">Seu código</p>
            <motion.p
              key={invite?.code ?? 'vazio'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.soft}
              className="numeric mt-3 font-display text-[2.5rem] leading-none tracking-[0.16em] text-ink"
            >
              {invite?.code ?? '••••••'}
            </motion.p>
            <p className="mt-4 text-[0.8125rem] text-ink-3">Vale por 48 horas e só pode ser usado uma vez.</p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft">
            <CodeAction icon={copied ? Check : Copy} label={copied ? 'Copiado' : 'Copiar'} onClick={copyCode} />
            <CodeAction icon={Share2} label="Enviar" onClick={shareCode} />
            <CodeAction icon={RefreshCw} label="Trocar" onClick={regenerate} />
          </div>
        </Surface>
      </Rise>

      <Rise className="px-5 pt-9">
        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[0.75rem] uppercase tracking-[0.12em] text-ink-3">ou</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <p className="mt-7 text-[0.9375rem] leading-relaxed text-ink-2">
          Se foi ela quem começou, digite aqui o código que ela te mandou.
        </p>

        <div className="mt-4 space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            aria-label="Código de convite"
            aria-invalid={error ? true : undefined}
            className="numeric font-display h-16 w-full rounded-lg border border-line bg-surface text-center text-[1.75rem] tracking-[0.3em] text-ink shadow-soft outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-3/50 focus:border-accent focus:ring-4 focus:ring-accent/12"
          />
          {error && <p role="alert" className="px-1 text-[0.8125rem] text-danger">{error}</p>}
          <Button full size="lg" variant="secondary" loading={joining} disabled={code.length < 6} onClick={join}>
            Entrar com este código
          </Button>
        </div>
      </Rise>
    </Screen>
  )
}

function CodeAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={spring.snappy}
      className="flex h-16 flex-col items-center justify-center gap-1.5 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon size={18} strokeWidth={1.9} />
      <span className="text-[0.75rem] font-medium">{label}</span>
    </motion.button>
  )
}
