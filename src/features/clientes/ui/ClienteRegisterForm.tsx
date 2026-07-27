import type { GeneroCliente } from '@/features/clientes/model/cliente'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

import type { ClienteRegisterValues } from '@/features/clientes/ui/clienteRegisterForm'

const generoOptions: Array<{ value: GeneroCliente; label: string }> = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'OUTRO', label: 'Outro' },
]

type Props = {
  values: ClienteRegisterValues
  onChange: (values: ClienteRegisterValues) => void
  disabled?: boolean
  idPrefix?: string
}

export function ClienteRegisterForm({
  values,
  onChange,
  disabled,
  idPrefix = '',
}: Props) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name)

  const patch = (partial: Partial<ClienteRegisterValues>) =>
    onChange({ ...values, ...partial })

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={id('nome')}>Nome</Label>
        <Input
          id={id('nome')}
          value={values.nome}
          onChange={(e) => patch({ nome: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={id('email')}>Email</Label>
        <Input
          id={id('email')}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => patch({ email: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={id('login')}>Login</Label>
        <Input
          id={id('login')}
          autoComplete="username"
          value={values.login}
          onChange={(e) => patch({ login: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={id('senha')}>Senha de acesso</Label>
        <Input
          id={id('senha')}
          type="password"
          autoComplete="new-password"
          value={values.senha}
          onChange={(e) => patch({ senha: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={id('data_nascimento')}>Data de nascimento</Label>
        <Input
          id={id('data_nascimento')}
          type="date"
          value={values.data_nascimento}
          onChange={(e) => patch({ data_nascimento: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <Label>Gênero</Label>
        <Select
          value={values.genero}
          onValueChange={(value) => patch({ genero: value as GeneroCliente })}
          disabled={disabled}
        >
          <SelectTrigger id={id('genero')}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {generoOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
