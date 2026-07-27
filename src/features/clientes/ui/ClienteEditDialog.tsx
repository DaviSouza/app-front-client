import { useMemo, useState } from 'react'

import type { Cliente, ClienteUpdate, GeneroCliente } from '@/features/clientes/model/cliente'

type ClienteEditForm = Omit<ClienteUpdate, 'senha'> & {
  novaSenha: string
}
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onSave: (id: string, data: ClienteUpdate) => void | Promise<void>
  isSaving?: boolean
}

const generoOptions: Array<{ value: GeneroCliente; label: string }> = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'OUTRO', label: 'Outro' },
]

export function ClienteEditDialog({
  open,
  onOpenChange,
  cliente,
  onSave,
  isSaving,
}: Props) {
  const initial = useMemo<ClienteEditForm | null>(() => {
    if (!cliente) return null
    return {
      nome: cliente.nome,
      email: cliente.email,
      login: cliente.login,
      data_nascimento: cliente.data_nascimento,
      genero: cliente.genero,
      novaSenha: '',
    }
  }, [cliente])

  const [form, setForm] = useState<ClienteEditForm | null>(initial)

  const buildUpdate = (values: ClienteEditForm): ClienteUpdate => {
    const data: ClienteUpdate = {
      nome: values.nome,
      email: values.email,
      login: values.login,
      data_nascimento: values.data_nascimento,
      genero: values.genero,
    }
    const senha = values.novaSenha.trim()
    if (senha) data.senha = senha
    return data
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar cliente</DialogTitle>
          <DialogDescription>
            Atualize os dados do cliente. Para trocar a senha de acesso, informe uma nova abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={form?.nome ?? ''}
              onChange={(e) => setForm((s) => (s ? { ...s, nome: e.target.value } : s))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form?.email ?? ''}
              onChange={(e) => setForm((s) => (s ? { ...s, email: e.target.value } : s))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="login">Login</Label>
            <Input
              id="login"
              value={form?.login ?? ''}
              onChange={(e) => setForm((s) => (s ? { ...s, login: e.target.value } : s))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nova-senha">Nova senha de acesso</Label>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              placeholder="Deixe em branco para manter a atual"
              value={form?.novaSenha ?? ''}
              onChange={(e) => setForm((s) => (s ? { ...s, novaSenha: e.target.value } : s))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="data_nascimento">Data de nascimento</Label>
            <Input
              id="data_nascimento"
              type="date"
              value={form?.data_nascimento ?? ''}
              onChange={(e) =>
                setForm((s) => (s ? { ...s, data_nascimento: e.target.value } : s))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>Gênero</Label>
            <Select
              value={form?.genero ?? undefined}
              onValueChange={(value) =>
                setForm((s) =>
                  s ? { ...s, genero: value as GeneroCliente } : s,
                )
              }
            >
              <SelectTrigger>
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

        <DialogFooter className="mt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!cliente || !form || isSaving}
            onClick={() => {
              if (!cliente || !form) return
              void onSave(cliente.id, buildUpdate(form))
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

