import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'

import { clientesRepository, type ClienteCreate } from '@/features/clientes/api/clientesRepository'
import type { Cliente, ClienteUpdate } from '@/features/clientes/model/cliente'
import { clienteKeys } from '@/features/clientes/queries/clienteKeys'
import { ClienteCreateDialog } from '@/features/clientes/ui/ClienteCreateDialog'
import { ClienteDeleteDialog } from '@/features/clientes/ui/ClienteDeleteDialog'
import { ClienteEditDialog } from '@/features/clientes/ui/ClienteEditDialog'
import { queryClient } from '@/app/queryClient'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

export function ClientesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Cliente | null>(null)

  const clientesQuery = useQuery({
    queryKey: clienteKeys.all,
    queryFn: () => clientesRepository.list(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClienteUpdate }) =>
      clientesRepository.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clienteKeys.all })
      setEditOpen(false)
      setSelected(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: ClienteCreate) => clientesRepository.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clienteKeys.all })
      setCreateOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientesRepository.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clienteKeys.all })
      setDeleteOpen(false)
      setSelected(null)
    },
  })

  const clientes = clientesQuery.data ?? []
  const rows = clientes.map((c) => ({ ...c }))

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <CardTitle>Clientes</CardTitle>
            <div className="text-sm text-muted-foreground">
              {clientesQuery.isLoading
                ? 'Carregando...'
                : `${clientes.length} cliente(s)`}
            </div>
          </div>

          <Button type="button" onClick={() => setCreateOpen(true)}>
            Novo cliente
          </Button>
        </CardHeader>
        <CardContent>
          {clientesQuery.isError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
              Erro ao carregar clientes.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Data nascimento</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead className="text-right">Alterar</TableHead>
                  <TableHead className="text-right">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.login}</TableCell>
                    <TableCell>{c.data_nascimento}</TableCell>
                    <TableCell>{c.genero}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => {
                          setSelected(c)
                          setEditOpen(true)
                        }}
                        aria-label={`Alterar ${c.nome}`}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="icon"
                        type="button"
                        onClick={() => {
                          setSelected(c)
                          setDeleteOpen(true)
                        }}
                        aria-label={`Excluir ${c.nome}`}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!clientesQuery.isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClienteEditDialog
        key={selected?.id ? `${selected.id}-${editOpen}` : 'empty'}
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setSelected(null)
        }}
        cliente={selected}
        isSaving={updateMutation.isPending}
        onSave={(id, data) => updateMutation.mutate({ id, data })}
      />

      <ClienteCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isCreating={createMutation.isPending}
        onCreate={(data) => createMutation.mutate(data)}
      />

      <ClienteDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          if (!o) setSelected(null)
        }}
        clienteNome={selected?.nome}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (!selected) return
          deleteMutation.mutate(selected.id)
        }}
      />
    </>
  )
}

