import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth/AuthContext'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { from?: string; message?: string } | null
  const from = locationState?.from
  const returnTo = typeof from === 'string' && from.startsWith('/') ? from : '/clientes'
  const [emailOrLogin, setEmailOrLogin] = useState('')
  const [password, setPassword] = useState('')
  const [info, setInfo] = useState<string | null>(locationState?.message ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = emailOrLogin.trim() && password && !loading

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Use seu e-mail ou login. A senha é validada no backend; o JWT é emitido pelo Cognito.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {info ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">{info}</div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="login-identificador">E-mail ou login</Label>
          <Input
            id="login-identificador"
            type="text"
            autoComplete="username"
            placeholder="email@exemplo.com ou seu_login"
            value={emailOrLogin}
            onChange={(e) => setEmailOrLogin(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            setError(null)
            setInfo(null)
            setLoading(true)
            void auth
              .login(emailOrLogin.trim(), password)
              .then(() => navigate(returnTo))
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Falha no login.')
              })
              .finally(() => setLoading(false))
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="flex flex-col gap-1 text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" to="/forgot-password">
            Esqueci minha senha
          </Link>
          <Link className="text-primary underline-offset-4 hover:underline" to="/cadastre-se">
            Cadastre-se
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
