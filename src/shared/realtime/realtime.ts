export type ClienteCadastradoEvent = {
  nome: string
  createdAt: number
}

export type ClientesImportadosEvent = {
  total: number
  createdAt: number
}

type Unsubscribe = () => void

type EventMap = {
  clienteCadastrado: ClienteCadastradoEvent
  clientesImportados: ClientesImportadosEvent
  message: { message: string; createdAt: number }
}

type EventType = keyof EventMap
type Handler<K extends EventType> = (event: EventMap[K]) => void

class RealtimeBus {
  private handlers: { [K in EventType]: Set<(event: EventMap[K]) => void> } = {
    clienteCadastrado: new Set(),
    clientesImportados: new Set(),
    message: new Set(),
  }

  private channel?: BroadcastChannel
  private es?: EventSource

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('app-front-client-realtime')
      this.channel.onmessage = (ev: MessageEvent) => {
        const data = ev.data as unknown
        if (!data || typeof data !== 'object') return
        if (!('type' in data) || !('event' in data)) return
        const t = (data as { type?: unknown }).type
        const e = (data as { event?: unknown }).event
        if (t === 'clienteCadastrado' || t === 'clientesImportados' || t === 'message') {
          this.emit(t, e as never, { broadcast: false })
        }
      }
    }

    if (typeof window !== 'undefined' && 'EventSource' in window) {
      this.connectSse(getRealtimeSseEndpoint())
    }
  }

  private connectSse(endpoint: string) {
    let retryMs = 1000

    const open = () => {
      try {
        this.es?.close()
      } catch {
        // ignore
      }

      const es = new EventSource(endpoint, { withCredentials: false })
      this.es = es

      es.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data) as unknown
          if (!data || typeof data !== 'object') return
          const t = (data as { type?: unknown }).type
          const e = (data as { event?: unknown }).event
          if (t === 'clienteCadastrado' || t === 'clientesImportados' || t === 'message') {
            this.emit(t, e as never, { broadcast: false })
          }
        } catch {
          // ignore
        }
      }

      es.onerror = () => {
        try {
          es.close()
        } catch {
          // ignore
        }
        window.setTimeout(open, retryMs)
        retryMs = Math.min(15000, Math.round(retryMs * 1.8))
      }
    }

    open()
  }

  on<K extends EventType>(type: K, handler: Handler<K>): Unsubscribe {
    const set = this.handlers[type] as Set<Handler<K>>
    set.add(handler)
    return () => set.delete(handler)
  }

  emit<K extends EventType>(type: K, event: EventMap[K], opts?: { broadcast?: boolean }) {
    const set = this.handlers[type] as Set<Handler<K>>
    if (set.size === 0) return
    for (const h of set) h(event)

    const shouldBroadcast = opts?.broadcast !== false
    if (shouldBroadcast && this.channel) {
      this.channel.postMessage({ type, event })
    }
  }
}

export const realtime = new RealtimeBus()

export function realtimeEmitClienteCadastrado(nome: string) {
  const safeName = nome.trim()
  if (!safeName) return
  realtime.emit('clienteCadastrado', { nome: safeName, createdAt: Date.now() })
}

export function realtimeEmitClientesImportados(total: number) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0
  realtime.emit('clientesImportados', { total: safeTotal, createdAt: Date.now() })
}

function envString(key: string): string | undefined {
  const value = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** SSE: CloudFront /realtime/events (HTTPS). API Gateway não suporta conexão SSE longa (timeout 30s). */
function getRealtimeSseEndpoint(): string {
  const explicit = envString('VITE_REALTIME_SSE_URL')
  if (explicit) return explicit
  return '/realtime/events'
}

/** POST publish: API Gateway /realtime/* em produção; proxy Vite em dev. */
function getRealtimeHttpBase(): string {
  const explicit = envString('VITE_REALTIME_HTTP_URL')
  if (explicit) return explicit.replace(/\/$/, '')
  const apiGw = envString('VITE_API_GATEWAY_URL')
  if (apiGw) return `${apiGw.replace(/\/$/, '')}/realtime`
  return '/realtime'
}

export async function realtimePublishClienteCadastrado(nome: string) {
  const safeName = nome.trim()
  if (!safeName) return

  realtimeEmitClienteCadastrado(safeName)

  try {
    await fetch(`${getRealtimeHttpBase()}/cliente-cadastrado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: safeName }),
    })
  } catch {
    // ignore
  }
}

export async function realtimePublishClientesImportados(total: number) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0

  realtimeEmitClientesImportados(safeTotal)

  try {
    await fetch(`${getRealtimeHttpBase()}/clientes-importados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total: safeTotal }),
    })
  } catch {
    // ignore
  }
}

export async function realtimePublishMessage(message: string) {
  const safe = message.trim()
  if (!safe) return

  realtime.emit('message', { message: safe, createdAt: Date.now() })

  try {
    await fetch(`${getRealtimeHttpBase()}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: safe }),
    })
  } catch {
    // ignore
  }
}

