import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { repository } from './repository'
import type { Couple, User } from '@/domain/types'

interface SessionValue {
  /** null = deslogado. undefined nunca vaza: `loading` cobre o intervalo. */
  user: User | null
  couple: Couple | null
  members: User[]
  loading: boolean
  /** A outra pessoa da parceria, quando já conectada. */
  partner: User | null
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const loadCouple = useCallback(async (current: User | null) => {
    if (!current?.coupleId) {
      setCouple(null)
      setMembers([])
      return
    }
    try {
      const [loadedCouple, loadedMembers] = await Promise.all([
        repository.getCouple(current.coupleId),
        repository.getMembers(current.coupleId),
      ])
      setCouple(loadedCouple)
      setMembers(loadedMembers)
    } catch {
      setCouple(null)
      setMembers([])
    }
  }, [])

  useEffect(() => {
    return repository.onAuthChange((nextUser) => {
      setUser(nextUser)
      void loadCouple(nextUser).finally(() => setLoading(false))
    })
  }, [loadCouple])

  const refresh = useCallback(async () => {
    await loadCouple(user)
  }, [loadCouple, user])

  const value = useMemo<SessionValue>(() => {
    // A ordem dos membros define as cores: o primeiro fica com 'mine'.
    const ordered = user ? [...members].sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0)) : members
    return {
      user,
      couple,
      members: ordered,
      loading,
      partner: ordered.find((m) => m.id !== user?.id) ?? null,
      refresh,
    }
  }, [user, couple, members, loading, refresh])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession precisa estar dentro de SessionProvider')
  return value
}

/** Para telas que só existem com usuário logado — evita `user!` espalhado. */
export function useCurrentUser(): User {
  const { user } = useSession()
  if (!user) throw new Error('Tela protegida renderizada sem usuário')
  return user
}
