import { useState } from 'react'
import { Link } from 'react-router-dom'

import { authRepository } from '@/app/auth/authRepository'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Enviaremos um código para o seu e-mail via API Gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">{message}</div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="forgot-email">E-mail</Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button
          type="button"
          disabled={!email.trim() || loading}
          onClick={() => {
            setError(null)
            setMessage(null)
            setLoading(true)
            void authRepository
              .forgotPassword({ email: email.trim() })
              .then((res) =>
                setMessage(
                  res.message ??
                    'Código enviado. Use a página de redefinição para informar o código recebido.',
                ),
              )
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Falha ao solicitar recuperação.')
              })
              .finally(() => setLoading(false))
          }}
        >
          {loading ? 'Enviando...' : 'Enviar código'}
        </Button>

        <div className="flex flex-col gap-1 text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" to="/reset-password">
            Já tenho o código — redefinir senha
          </Link>
          <Link className="text-primary underline-offset-4 hover:underline" to="/login">
            Voltar ao login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
