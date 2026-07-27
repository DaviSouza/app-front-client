import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { authRepository } from '@/app/auth/authRepository'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = email.trim() && code.trim() && newPassword && !loading

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Informe o código recebido por e-mail e a nova senha.</CardDescription>
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
          <Label htmlFor="reset-email">E-mail</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reset-code">Código</Label>
          <Input
            id="reset-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reset-password">Nova senha</Label>
          <Input
            id="reset-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            setError(null)
            setMessage(null)
            setLoading(true)
            void authRepository
              .resetPassword({
                email: email.trim(),
                code: code.trim(),
                newPassword,
              })
              .then((res) => setMessage(res.message ?? 'Senha redefinida com sucesso.'))
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Falha ao redefinir senha.')
              })
              .finally(() => setLoading(false))
          }}
        >
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </Button>

        <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/login">
          Voltar ao login
        </Link>
      </CardContent>
    </Card>
  )
}
