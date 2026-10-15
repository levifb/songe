import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Heart, House, Plus, Target } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { spring } from '@/design/motion'
import { useData } from './DataProvider'

interface TabDefinition {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  end?: boolean
}

/**
 * Duas abas de cada lado do "+". O botão de registrar contribuição precisa
 * cair debaixo do polegar, e para ficar centrado o número de abas tem que ser par.
 */
const LEFT_TABS: TabDefinition[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/metas', label: 'Metas', icon: Target },
]

const RIGHT_TABS: TabDefinition[] = [
  { to: '/novidades', label: 'Novidades', icon: Bell },
  { to: '/nos', label: 'Nós', icon: Heart },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeGoals, unreadCount } = useData()
  const canContribute = activeGoals.length > 0

  const openAdd = () => {
    // Guarda a tela atual para que a folha suba por cima dela — e para que o
    // botão "voltar" do Android feche a folha em vez de sair do app.
    navigate('/aportar', { state: { background: location } })
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-ground">
      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[27rem] border-t border-line-soft bg-ground/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div className="flex items-stretch px-1">
          {LEFT_TABS.map((tab) => (
            <TabButton key={tab.to} {...tab} />
          ))}

          <div className="flex w-18 shrink-0 justify-center">
            <motion.button
              type="button"
              onClick={openAdd}
              whileTap={{ scale: 0.9 }}
              transition={spring.snappy}
              disabled={!canContribute}
              aria-label={canContribute ? 'Registrar contribuição' : 'Crie uma meta antes de registrar'}
              className={cn(
                'relative -mt-5 grid size-14 place-items-center rounded-full transition-colors duration-200',
                canContribute
                  ? 'bg-accent text-on-accent shadow-float'
                  : 'cursor-not-allowed bg-alpine-200 text-alpine-400 dark:bg-alpine-800 dark:text-alpine-600',
              )}
            >
              <Plus size={25} strokeWidth={2.25} />
            </motion.button>
          </div>

          {RIGHT_TABS.map((tab) => (
            <TabButton key={tab.to} {...tab} badge={tab.to === '/novidades' ? unreadCount : 0} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabButton({ to, label, icon: Icon, end, badge = 0 }: TabDefinition & { badge?: number }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 rounded-md py-2.5 transition-colors duration-200',
          isActive ? 'text-accent' : 'text-ink-3 hover:text-ink-2',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
            {badge > 0 && (
              <span
                className="absolute -right-1.5 -top-0.5 size-2 rounded-full bg-accent ring-2 ring-ground"
                aria-label={`${badge} novidades`}
              />
            )}
          </span>
          <span className="text-[0.6875rem] font-medium tracking-[0.005em]">{label}</span>
        </>
      )}
    </NavLink>
  )
}
