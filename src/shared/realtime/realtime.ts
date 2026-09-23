/**
 * Camada de realtime do front: pub/sub local + sincronização entre abas
 * (BroadcastChannel) + eventos vindos do servidor (SSE) + publicação HTTP.
 *
 * Fluxo típico:
 * 1. Algo acontece (cadastro/importação) → publish* / emit*
 * 2. Listeners na mesma aba recebem via RealtimeBus
 * 3. Outras abas do mesmo browser recebem via BroadcastChannel
 * 4. Outros clientes (ou o servidor) recebem via POST /realtime/* → SSE
 */

/** Payload quando um cliente é cadastrado. */
export type ClienteCadastradoEvent = {
  nome: string
  createdAt: number
}

/** Payload quando uma importação em lote conclui. */
export type ClientesImportadosEvent = {
  total: number
  createdAt: number
}

/** Função retornada por `on()` para remover o listener. */
type Unsubscribe = () => void

/** Mapa tipado: nome do evento → formato do payload. */
type EventMap = {
  clienteCadastrado: ClienteCadastradoEvent
  clientesImportados: ClientesImportadosEvent
  message: { message: string; createdAt: number }
}

type EventType = keyof EventMap
type Handler<K extends EventType> = (event: EventMap[K]) => void

/**
 * Barramento singleton de eventos em tempo real.
 * - Mantém handlers locais (Observer/Pub-Sub)
 * - Espelha eventos entre abas com BroadcastChannel
 * - Consome Server-Sent Events (SSE) do backend
 */
class RealtimeBus {
  /** Listeners registrados por tipo de evento (Set evita duplicata e facilita off). */
  private handlers: { [K in EventType]: Set<(event: EventMap[K]) => void> } = {
    clienteCadastrado: new Set(),
    clientesImportados: new Set(),
    message: new Set(),
  }

  /** Canal entre abas/janelas do mesmo origin (não atravessa browsers/máquinas). */
  private channel?: BroadcastChannel
  /** Conexão SSE aberta com o endpoint de eventos do servidor. */
  private es?: EventSource

  constructor() {
    // Sincroniza eventos entre abas: quando uma aba emite, as outras recebem aqui.
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('app-front-client-realtime')
      this.channel.onmessage = (ev: MessageEvent) => {
        const data = ev.data as unknown
        if (!data || typeof data !== 'object') return
        if (!('type' in data) || !('event' in data)) return
        const t = (data as { type?: unknown }).type
        const e = (data as { event?: unknown }).event
        // Reemite localmente sem rebroadcast (evita loop infinito entre abas).
        if (t === 'clienteCadastrado' || t === 'clientesImportados' || t === 'message') {
          this.emit(t, e as never, { broadcast: false })
        }
      }
    }

    // Abre SSE no browser para receber pushes do servidor (ex.: insights/MCP).
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      this.connectSse(getRealtimeSseEndpoint())
    }
  }

  /**
   * Conecta ao stream SSE e reconecta com backoff exponencial em caso de erro.
   * EventSource nativo já tenta reconectar; aqui fechamos e reabrimos com delay
   * controlado para não martelar o endpoint.
   */
  private connectSse(endpoint: string) {
    let retryMs = 1000

    const open = () => {
      try {
        this.es?.close()
      } catch {
        // ignore — conexão anterior pode já estar fechada
      }

      const es = new EventSource(endpoint, { withCredentials: false })
      this.es = es

      // Mensagens SSE: JSON `{ type, event }` → dispara handlers locais (sem broadcast).
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
          // ignore — payload inválido / não-JSON
        }
      }

      // Em erro: fecha, espera e tenta de novo (até ~15s entre tentativas).
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

  /** Inscreve um handler; retorna função para cancelar a inscrição. */
  on<K extends EventType>(type: K, handler: Handler<K>): Unsubscribe {
    const set = this.handlers[type] as Set<Handler<K>>
    set.add(handler)
    return () => set.delete(handler)
  }

  /**
   * Dispara o evento para todos os listeners da aba atual.
   * Por padrão também publica no BroadcastChannel para as outras abas.
   * Passe `{ broadcast: false }` quando o evento já veio de outra aba ou do SSE.
   */
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

/** Instância única usada por toda a SPA. */
export const realtime = new RealtimeBus()

/** Emite localmente (e entre abas) que um cliente foi cadastrado. */
export function realtimeEmitClienteCadastrado(nome: string) {
  const safeName = nome.trim()
  if (!safeName) return
  realtime.emit('clienteCadastrado', { nome: safeName, createdAt: Date.now() })
}

/** Emite localmente (e entre abas) o total de clientes importados. */
export function realtimeEmitClientesImportados(total: number) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0
  realtime.emit('clientesImportados', { total: safeTotal, createdAt: Date.now() })
}

/** Lê variável Vite `VITE_*` se existir e não estiver vazia. */
function envString(key: string): string | undefined {
  const value = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * URL do stream SSE.
 * Preferir CloudFront /realtime/events (HTTPS): API Gateway corta SSE longa (timeout ~30s).
 */
function getRealtimeSseEndpoint(): string {
  const explicit = envString('VITE_REALTIME_SSE_URL')
  if (explicit) return explicit
  return '/realtime/events'
}

/**
 * Base HTTP para publicar eventos no servidor.
 * Produção: API Gateway …/realtime/* ; Dev: proxy Vite em /realtime.
 */
function getRealtimeHttpBase(): string {
  const explicit = envString('VITE_REALTIME_HTTP_URL')
  if (explicit) return explicit.replace(/\/$/, '')
  const apiGw = envString('VITE_API_GATEWAY_URL')
  if (apiGw) return `${apiGw.replace(/\/$/, '')}/realtime`
  return '/realtime'
}

/**
 * Publica cadastro: atualiza UI local/abas e notifica o servidor
 * (que pode retransmitir via SSE para outros clientes).
 */
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
    // ignore — falha de publish não deve quebrar o fluxo de cadastro
  }
}

/** Idem para importação em lote. */
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

/** Publica mensagem genérica (toast / insight) local + servidor. */
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
