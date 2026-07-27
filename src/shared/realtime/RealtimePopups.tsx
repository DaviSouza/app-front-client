import { useEffect, useMemo, useState } from 'react'
import { Bot } from 'lucide-react'

import { realtime } from '@/shared/realtime/realtime'

type ToastItem = {
  id: string
  message: string
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function RealtimePopups() {
  const [items, setItems] = useState<ToastItem[]>([])

  const ttlMs = 4500
  const maxVisible = 4

  const containerClassName = useMemo(
    () =>
      'pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2',
    [],
  )

  useEffect(() => {
    const unsub1 = realtime.on('clienteCadastrado', (e) => {
      const id = makeId()
      setItems((prev) => [{ id, message: `Cliente ${e.nome} cadastrado` }, ...prev].slice(0, maxVisible))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, ttlMs)
    })

    const unsub2 = realtime.on('clientesImportados', (e) => {
      const id = makeId()
      setItems((prev) => [{ id, message: `Foram importados ${e.total} de clientes` }, ...prev].slice(0, maxVisible))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, ttlMs)
    })

    const unsub3 = realtime.on('message', (e) => {
      const id = makeId()
      setItems((prev) => [{ id, message: e.message }, ...prev].slice(0, maxVisible))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, ttlMs)
    })

    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className={containerClassName} aria-live="polite" aria-relevant="additions">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/70"
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-muted-foreground">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="text-sm">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

