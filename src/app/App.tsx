import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppShell } from './AppShell'
import { DataProvider } from './DataProvider'
import { useSession } from './SessionProvider'
import { repository } from './repository'
import { refreshPushSubscription } from '@/services/push'
import { SplashScreen } from '@/features/auth/SplashScreen'
import { WelcomeScreen } from '@/features/auth/WelcomeScreen'
import { SignInScreen } from '@/features/auth/SignInScreen'
import { SignUpScreen } from '@/features/auth/SignUpScreen'
import { ConnectPartnerScreen } from '@/features/couple/ConnectPartnerScreen'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { GoalsScreen } from '@/features/goals/GoalsScreen'
import { GoalFormScreen } from '@/features/goals/GoalFormScreen'
import { GoalDetailScreen } from '@/features/goals/GoalDetailScreen'
import { ActivityScreen } from '@/features/activity/ActivityScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { SettingsScreen } from '@/features/profile/SettingsScreen'
import { AddContributionSheet } from '@/features/contributions/AddContributionSheet'

export function App() {
  const { user, loading } = useSession()

  if (loading) return <SplashScreen />
  if (!user) return <PublicRoutes />

  return (
    <DataProvider>
      <PrivateRoutes />
    </DataProvider>
  )
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/bem-vindo" element={<WelcomeScreen />} />
      <Route path="/entrar" element={<SignInScreen />} />
      <Route path="/criar-conta" element={<SignUpScreen />} />
      <Route path="*" element={<Navigate to="/bem-vindo" replace />} />
    </Routes>
  )
}

function PrivateRoutes() {
  useEnsureCouple()
  useKeepPushAlive()
  const location = useLocation()

  // A folha de contribuição sobe por cima da tela que estava aberta.
  const background = (location.state as { background?: Location } | null)?.background

  return (
    <AppShell>
      <Routes location={background ?? location}>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/metas" element={<GoalsScreen />} />
        <Route path="/metas/nova" element={<GoalFormScreen mode="create" />} />
        <Route path="/metas/:goalId" element={<GoalDetailScreen />} />
        <Route path="/metas/:goalId/editar" element={<GoalFormScreen mode="edit" />} />
        <Route path="/novidades" element={<ActivityScreen />} />
        <Route path="/nos" element={<ProfileScreen />} />
        <Route path="/nos/ajustes" element={<SettingsScreen />} />
        <Route path="/conectar" element={<ConnectPartnerScreen />} />
        <Route path="/aportar" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AnimatePresence>
        {background && (
          <Routes location={location}>
            <Route path="/aportar" element={<AddContributionSheet />} />
          </Routes>
        )}
      </AnimatePresence>
    </AppShell>
  )
}

/**
 * Os navegadores trocam a assinatura de notificação de tempos em tempos, por
 * conta própria. Sem isto, os avisos parariam de chegar em silêncio.
 */
function useKeepPushAlive() {
  const { user } = useSession()

  useEffect(() => {
    if (!user?.coupleId) return
    void refreshPushSubscription()
  }, [user?.coupleId])
}

/**
 * Quem cria a conta primeiro não fica esperando ninguém: a parceria nasce
 * na hora, só com essa pessoa, e o convite fica guardado para quando a outra
 * chegar. O app inteiro já funciona antes disso.
 */
function useEnsureCouple() {
  const { user, refresh } = useSession()
  const creating = useRef(false)

  useEffect(() => {
    if (!user || user.coupleId || creating.current) return
    creating.current = true
    void repository
      .createCouple()
      .then(() => refresh())
      .catch((error) => {
        // Falhar aqui deixa a pessoa sem parceria e sem código para convidar.
        // Silêncio seria o pior desfecho possível.
        console.error('Não consegui criar a parceria inicial:', error)
      })
      .finally(() => {
        creating.current = false
      })
  }, [user, refresh])
}
