import { useState } from 'react'

import type { ClienteCreate } from '@/features/clientes/api/clientesRepository'
import {
  emptyClienteRegisterValues,
  isClienteRegisterValid,
} from '@/features/clientes/ui/clienteRegisterForm'
import { ClienteRegisterForm } from '@/features/clientes/ui/ClienteRegisterForm'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: ClienteCreate) => void | Promise<void>
  isCreating?: boolean
}

export function ClienteCreateDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: Props) {
  const [form, setForm] = useState<ClienteCreate>(emptyClienteRegisterValues)

  const canSubmit = isClienteRegisterValid(form) && !isCreating

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setForm(emptyClienteRegisterValues)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastre os dados do cliente e a conta de acesso (Cognito + registro no sistema).
          </DialogDescription>
        </DialogHeader>

        <ClienteRegisterForm
          values={form}
          onChange={setForm}
          disabled={isCreating}
          idPrefix="create"
        />

        <p className="text-sm text-muted-foreground">
          A senha será armazenada com hash (bcrypt) no backend. O cliente poderá entrar com e-mail ou
          login.
        </p>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            type="button"
            disabled={isCreating}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void onCreate(form)}>
            {isCreating ? 'Salvando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
