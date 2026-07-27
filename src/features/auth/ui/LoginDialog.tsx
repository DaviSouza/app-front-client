import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth/auth'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function LoginDialog() {
  const { login, loginOpen, loginRedirectTo, closeLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@dsmercado.com')
  const [senha, setSenha] = useState('admin')

  const mutation = useMutation({
    mutationFn: () => login({ email, senha }),
    onSuccess: () => {
      closeLogin()
    },
  })

  const errorMessage = useMemo(() => {
    const err = mutation.error
    if (!err) return null
    if (err instanceof Error) return err.message
    return 'Erro ao realizar login.'
  }, [mutation.error])

  return (
    <Dialog
      open={loginOpen}
      onOpenChange={(next) => {
        if (!next) closeLogin()
      }}
    >
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Entrar</DialogTitle>
          <DialogDescription>
            Informe seu email e senha para acessar o sistema.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mutation.isPending}
              placeholder="admin@dsmercado.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="login-senha">Senha</Label>
            <Input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={mutation.isPending}
              placeholder="admin"
              required
            />
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                closeLogin()
                if (loginRedirectTo) navigate('/')
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

