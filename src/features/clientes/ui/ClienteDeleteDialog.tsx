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
  clienteNome?: string
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
}

export function ClienteDeleteDialog({
  open,
  onOpenChange,
  clienteNome,
  onConfirm,
  isDeleting,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir cliente</DialogTitle>
          <DialogDescription>
            {clienteNome
              ? `Tem certeza que deseja excluir "${clienteNome}"?`
              : 'Tem certeza que deseja excluir este cliente?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

