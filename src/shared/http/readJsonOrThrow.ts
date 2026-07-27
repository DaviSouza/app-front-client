export type HttpErrorDetails = {
  url?: string
  contentType?: string
  bodyPreview?: string
  code?: string
}

export class HttpResponseError extends Error {
  readonly status: number
  readonly details?: HttpErrorDetails

  constructor(message: string, status: number, details?: HttpErrorDetails) {
    super(message)
    this.name = 'HttpResponseError'
    this.status = status
    this.details = details
  }
}

async function readBodyAsText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

function tryParseJson(text: string): unknown | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return undefined
  }
}

function extractMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined

  if ('message' in data) {
    const m = (data as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m.trim()
  }

  if ('error' in data) {
    const e = (data as { error?: unknown }).error
    if (typeof e === 'string' && e.trim()) return e.trim()
  }

  return undefined
}

function extractCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('code' in data)) return undefined
  const code = (data as { code?: unknown }).code
  return typeof code === 'string' && code.trim() ? code.trim() : undefined
}

function buildDetails(res: Response, text: string, data: unknown): HttpErrorDetails {
  const preview = text.trim().slice(0, 400)
  return {
    url: res.url || undefined,
    contentType: res.headers.get('content-type') ?? undefined,
    bodyPreview: preview || undefined,
    code: extractCode(data),
  }
}

export async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await readBodyAsText(res)
  const data = tryParseJson(text)
  const details = buildDetails(res, text, data)

  if (!res.ok) {
    const fromJson = data !== undefined ? extractMessage(data) : undefined
    const isHtml = /^\s*</.test(text)
    const message =
      fromJson ??
      (!isHtml && text.trim() ? text.trim().slice(0, 200) : undefined) ??
      `Erro na requisição (HTTP ${res.status}).`

    throw new HttpResponseError(message, res.status, details)
  }

  if (data === undefined) {
    throw new HttpResponseError(
      `Resposta inválida da API (esperado JSON, recebido HTTP ${res.status}).`,
      res.status,
      details,
    )
  }

  return data as T
}
