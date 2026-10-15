import { Moon, Palette, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/app/ThemeProvider'
import { Rise, Screen, ScreenHeader, SectionTitle } from '@/design/primitives/Screen'
import { Surface } from '@/design/primitives/Surface'
import { NotificationSettings } from '@/features/notifications/NotificationSettings'
import { cn } from '@/lib/cn'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Palette },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
]

export function SettingsScreen() {
  const { preference, setPreference } = useTheme()

  return (
    <Screen className="pb-8">
      <ScreenHeader back title="Ajustes" />

      <section className="pt-6">
        <SectionTitle>Aparência</SectionTitle>
        <Rise className="px-5">
          <div className="grid grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map((option) => {
              const active = preference === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreference(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-2.5 rounded-lg border py-5 transition-colors',
                    active
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                  )}
                >
                  <option.icon size={19} strokeWidth={1.9} className={active ? 'text-accent' : undefined} />
                  <span className="text-[0.8125rem] font-medium">{option.label}</span>
                </button>
              )
            })}
          </div>
        </Rise>
      </section>

      <section className="pt-10">
        <SectionTitle>Notificações</SectionTitle>
        <Rise className="px-5">
          <NotificationSettings />
        </Rise>
      </section>

      <section className="pt-10">
        <SectionTitle>Sobre</SectionTitle>
        <Rise className="px-5">
          <Surface elevation="inset" className="space-y-3 p-5 text-[0.875rem] leading-relaxed text-ink-2">
            <p>
              O Songe não movimenta dinheiro, não conecta banco e não faz transferências. Ele só registra o que
              cada um informa ter separado.
            </p>
            <p className="text-ink-3">
              Fotos da biblioteca: acervo de licença livre, com crédito na tela de escolha.
            </p>
          </Surface>
        </Rise>
      </section>
    </Screen>
  )
}
