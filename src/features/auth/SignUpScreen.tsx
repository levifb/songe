import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { repository } from '@/app/repository'
import { RepositoryError } from '@/services/repository'
import { Button } from '@/design/primitives/Button'
import { TextField } from '@/design/primitives/Field'
import { Rise, Screen, ScreenHeader } from '@/design/primitives/Screen'

export function SignUpScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = name.trim().length >= 2 && email.includes('@') && password.length >= 6

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await repository.signUp({ name, email, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Não foi possível criar a conta agora.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen className="min-h-dvh bg-ground pb-10">
      <ScreenHeader
        back={() => navigate('/bem-vindo')}
        title="Vamos começar"
        subtitle="Três campos e o Songe é de vocês."
      />

      <Rise className="px-5 pt-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <TextField
            label="Como você quer ser chamado"
            value={name}
            onChange={setName}
            placeholder="Seu nome"
            autoComplete="name"
            maxLength={40}
          />
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
            placeholder="Pelo menos 6 caracteres"
            autoComplete="new-password"
            hint="Guarde bem — vocês vão usar pouco, então é fácil esquecer."
            error={error}
          />
          <Button type="submit" full size="lg" loading={loading} disabled={!canSubmit}>
            Criar conta
          </Button>
        </form>

        <p className="mt-8 text-center text-[0.9375rem] text-ink-2">
          Já criou a sua?{' '}
          <Link to="/entrar" className="font-medium text-accent underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </Rise>
    </Screen>
  )
}
