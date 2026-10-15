import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { repository } from '@/app/repository'
import { RepositoryError } from '@/services/repository'
import { Button } from '@/design/primitives/Button'
import { TextField } from '@/design/primitives/Field'
import { Rise, Screen, ScreenHeader } from '@/design/primitives/Screen'

export function SignInScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await repository.signIn({ email, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não foi possível entrar agora.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen className="min-h-dvh bg-ground pb-10">
      <ScreenHeader back={() => navigate('/bem-vindo')} title="Que bom te ver" subtitle="Entre para continuar de onde vocês pararam." />

      <Rise className="px-5 pt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="voce@email.com"
            autoComplete="email"
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••"
            autoComplete="current-password"
            error={error}
          />
          <Button type="submit" full size="lg" loading={loading} disabled={!email || !password}>
            Entrar
          </Button>
        </form>

        <p className="mt-8 text-center text-[0.9375rem] text-ink-2">
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-medium text-accent underline-offset-4 hover:underline">
            Criar agora
          </Link>
        </p>
      </Rise>
    </Screen>
  )
}
