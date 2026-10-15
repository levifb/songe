import { useEffect, useState } from 'react'
import { Bell, BellOff, Share, SquarePlus } from 'lucide-react'
import { useToast } from '@/app/ToastProvider'
import { Button } from '@/design/primitives/Button'
import { Surface } from '@/design/primitives/Surface'
import { disablePush, enablePush, getPushStatus, isIOS, type PushStatus } from '@/services/push'

/**
 * O bloco de notificações dos ajustes. A parte incomum é o estado
 * "needs-install": no iPhone, o Safari se recusa a pedir permissão enquanto
 * o Songe não estiver na tela de início — então em vez de um botão que
 * falharia, mostramos o passo a passo.
 */
export function NotificationSettings() {
  const { notify } = useToast()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getPushStatus().then(setStatus)
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      const next = status === 'on' ? await disablePush() : await enablePush()
      setStatus(next)

      if (next === 'on') notify('Pronto. Você será avisado quando ela registrar algo.')
      else if (next === 'denied') {
        notify('O navegador bloqueou os avisos. Libere nas configurações do site.', 'error')
      } else if (status === 'on') notify('Avisos desligados.')
    } catch {
      notify('Não consegui ativar os avisos agora.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (status === null) {
    return <Surface elevation="inset" className="h-24 animate-pulse" />
  }

  if (status === 'needs-install') {
    return (
      <Surface elevation="inset" className="p-5">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-3">
            <Bell size={17} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] leading-relaxed text-ink-2">
              {isIOS()
                ? 'No iPhone os avisos só funcionam com o Songe instalado na tela de início. É rápido:'
                : 'Instale o Songe na tela de início para receber os avisos:'}
            </p>
            <ol className="mt-4 space-y-3">
              <InstallStep icon={Share} n={1}>
                Toque em <strong className="font-medium text-ink">Compartilhar</strong>, na barra de baixo
                do Safari
              </InstallStep>
              <InstallStep icon={SquarePlus} n={2}>
                Escolha <strong className="font-medium text-ink">Adicionar à Tela de Início</strong>
              </InstallStep>
              <InstallStep icon={Bell} n={3}>
                Abra o Songe pelo ícone novo e volte aqui
              </InstallStep>
            </ol>
          </div>
        </div>
      </Surface>
    )
  }

  if (status === 'unsupported' || status === 'not-configured') {
    return (
      <Surface elevation="inset" className="p-5">
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          {status === 'unsupported'
            ? 'Este navegador não envia notificações. O sino de Novidades continua funcionando normalmente.'
            : 'As notificações ainda não foram configuradas neste servidor.'}
        </p>
      </Surface>
    )
  }

  const isOn = status === 'on'

  return (
    <Surface elevation="inset" className="p-5">
      <div className="flex items-start gap-3.5">
        <span
          className={
            isOn
              ? 'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent'
              : 'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-3'
          }
        >
          {isOn ? <Bell size={17} strokeWidth={1.9} /> : <BellOff size={17} strokeWidth={1.9} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-medium text-ink">
            {isOn ? 'Avisos ligados neste aparelho' : 'Avisos desligados'}
          </p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
            {status === 'denied'
              ? 'O navegador bloqueou os avisos para o Songe. Para reativar, libere as notificações nas configurações do site.'
              : 'Você é avisado quando a outra pessoa registra uma contribuição — nunca sobre as suas.'}
          </p>

          {status !== 'denied' && (
            <Button
              size="sm"
              variant={isOn ? 'secondary' : 'primary'}
              className="mt-4"
              loading={busy}
              onClick={toggle}
            >
              {isOn ? 'Desligar avisos' : 'Ligar avisos'}
            </Button>
          )}
        </div>
      </div>
    </Surface>
  )
}

function InstallStep({
  icon: Icon,
  n,
  children,
}: {
  icon: typeof Share
  n: number
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="numeric mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface text-[0.75rem] font-semibold text-ink-2">
        {n}
      </span>
      <span className="flex-1 text-[0.875rem] leading-relaxed text-ink-2">{children}</span>
      <Icon size={15} strokeWidth={1.9} className="mt-1 shrink-0 text-ink-3" />
    </li>
  )
}
