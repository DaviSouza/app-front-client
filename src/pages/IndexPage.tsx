import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function IndexPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Index</CardTitle>
        <CardDescription>Página inicial do sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use o menu lateral para acessar a listagem de clientes.
        </p>
      </CardContent>
    </Card>
  )
}

