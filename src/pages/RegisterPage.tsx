import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authRepository } from '@/app/auth/authRepository'
import {
  emptyClienteRegisterValues,
  isClienteRegisterValid,
  type ClienteRegisterValues,
} from '@/features/clientes/ui/clienteRegisterForm'
import { ClienteRegisterForm } from '@/features/clientes/ui/ClienteRegisterForm'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ClienteRegisterValues>(emptyClienteRegisterValues)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = isClienteRegisterValid(form) && !loading

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Cadastre-se</CardTitle>
        <CardDescription>
          Seus dados são salvos no backend com senha criptografada (bcrypt). Após cadastrar, faça
          login com e-mail ou login.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        ) : null}

        <ClienteRegisterForm
          values={form}
          onChange={setForm}
          disabled={loading}
          idPrefix="register"
        />

        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            setError(null)
            setLoading(true)
            void authRepository
              .register({
                nome: form.nome.trim(),
                email: form.email.trim(),
                login: form.login.trim(),
                data_nascimento: form.data_nascimento,
                genero: form.genero,
                senha: form.senha,
              })
              .then(() => {
                navigate('/login', {
                  state: {
                    message: 'Cadastro realizado. Entre com seu e-mail ou login.',
                  },
                })
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Falha ao cadastrar.')
              })
              .finally(() => setLoading(false))
          }}
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>

        <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/login">
          Já tenho conta — entrar
        </Link>
      </CardContent>
    </Card>
  )
}
