#!/usr/bin/env node
/**
 * MCP Server (Streamable HTTP) para "insights" do app-front-client.
 *
 * Objetivo (estudo):
 * - Expor dados (resources) e ações (tools) no padrão MCP.
 * - Um runner (cliente MCP) chama os resources/tools e publica notificações no realtime-server (SSE).
 *
 * Rotas MCP:
 * - GET/POST /mcp  (Streamable HTTP)
 *
 * Variáveis:
 * - MCP_PORT: porta do servidor MCP (default 8899)
 * - API_GATEWAY_URL: base do API Gateway (produção; ex. https://xxx.execute-api.sa-east-1.amazonaws.com)
 * - CLIENTES_API_URL: base URL da API de clientes (default API_GATEWAY_URL ou http://localhost:8002)
 * - CLIENTES_API_TOKEN: token Bearer fixo (opcional; tem prioridade sobre login)
 * - INSIGHTS_SERVICE_EMAIL / INSIGHTS_SERVICE_PASSWORD: login em /auth/login (email ou login)
 * - AUTH_EMAIL / AUTH_SENHA: alias legado para INSIGHTS_SERVICE_*
 * - REALTIME_HTTP_URL: base URL do realtime-server (default http://localhost:8787/realtime)
 * - CORS_ORIGIN: origem permitida no CORS (default "*")
 */

import http from 'node:http'
import { randomUUID } from 'node:crypto'

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

const MCP_PORT = Number(process.env.MCP_PORT ?? 8899)
const API_GATEWAY_URL = (process.env.API_GATEWAY_URL ?? '').replace(/\/$/, '')
const CLIENTES_API_URL = (
  process.env.CLIENTES_API_URL ??
  (API_GATEWAY_URL || 'http://localhost:8002')
).replace(/\/$/, '')
const CLIENTES_API_TOKEN = process.env.CLIENTES_API_TOKEN
const INSIGHTS_SERVICE_EMAIL =
  process.env.INSIGHTS_SERVICE_EMAIL?.trim() || process.env.AUTH_EMAIL?.trim() || ''
const INSIGHTS_SERVICE_PASSWORD =
  process.env.INSIGHTS_SERVICE_PASSWORD ?? process.env.AUTH_SENHA ?? ''
const REALTIME_HTTP_URL = process.env.REALTIME_HTTP_URL ?? 'http://localhost:8787/realtime'
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'

/** @type {{ access: string; id: string | null; expiresAt: number } | null} */
let cachedAuth = null

async function loginAndCacheTokens() {
  if (!INSIGHTS_SERVICE_EMAIL || !INSIGHTS_SERVICE_PASSWORD) {
    throw new Error(
      'INSIGHTS_SERVICE_EMAIL/PASSWORD não configurados (Secrets Manager / variáveis de ambiente).',
    )
  }

  const loginBase = API_GATEWAY_URL || CLIENTES_API_URL
  const res = await fetch(`${loginBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      emailOrLogin: INSIGHTS_SERVICE_EMAIL,
      password: INSIGHTS_SERVICE_PASSWORD,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Falha ao obter token via /auth/login (HTTP ${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
    )
  }

  const data = await res.json()
  const accessToken = typeof data?.accessToken === 'string' ? data.accessToken.trim() : ''
  const idToken = typeof data?.idToken === 'string' ? data.idToken.trim() : ''
  const expiresInNum = typeof data?.expiresIn === 'number' ? data.expiresIn : Number(data?.expiresIn)

  if (!accessToken) throw new Error('Resposta inválida do /auth/login: accessToken ausente.')

  const now = Date.now()
  cachedAuth = {
    access: `Bearer ${accessToken}`,
    id: idToken ? `Bearer ${idToken}` : null,
    expiresAt: now + (Number.isFinite(expiresInNum) ? expiresInNum : 3600) * 1000,
  }
  return cachedAuth
}

async function fetchClientesWithAuth(authorization) {
  const headers = new Headers()
  headers.set('Authorization', authorization)
  return fetch(`${CLIENTES_API_URL.replace(/\/$/, '')}/clientes`, {
    method: 'GET',
    headers,
  })
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return undefined
  return JSON.parse(raw)
}

async function fetchClientes() {
  if (CLIENTES_API_TOKEN?.trim()) {
    const res = await fetchClientesWithAuth(`Bearer ${CLIENTES_API_TOKEN.trim()}`)
    if (!res.ok) throw new Error(`Falha ao buscar clientes (HTTP ${res.status})`)
    return parseClientesResponse(await res.json())
  }

  if (!cachedAuth || cachedAuth.expiresAt <= Date.now() + 15_000) {
    await loginAndCacheTokens()
  }

  const tokens = cachedAuth
  if (!tokens) {
    throw new Error('Autenticação do serviço insights indisponível.')
  }

  let res = await fetchClientesWithAuth(tokens.access)
  if (res.status === 401 && tokens.id) {
    res = await fetchClientesWithAuth(tokens.id)
  }

  if (!res.ok) {
    throw new Error(
      `Falha ao buscar clientes (HTTP ${res.status}). Verifique INSIGHTS_SERVICE_EMAIL/PASSWORD no Secrets Manager e se o usuário existe no Postgres.`,
    )
  }

  return parseClientesResponse(await res.json())
}

function parseClientesResponse(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (data)
    for (const c of [obj.clientes, obj.data, obj.items, obj.result]) {
      if (Array.isArray(c)) return c
    }
  }
  throw new Error('Formato inesperado na listagem de clientes.')
}

async function publishRealtime(path, body) {
  const base = REALTIME_HTTP_URL.replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Falha ao publicar no realtime (HTTP ${res.status})`)
}

const mcp = new McpServer({ name: 'app-front-client-insights', version: '1.0.0' })

// Resource: lista de clientes (do backend)
mcp.registerResource(
  'clientes',
  'clientes://all',
  { title: 'Clientes', description: 'Lista de clientes do backend (/clientes).' },
  async () => {
    const clientes = await fetchClientes()
    return {
      contents: [
        {
          uri: 'clientes://all',
          mimeType: 'application/json',
          text: JSON.stringify(clientes),
        },
      ],
    }
  },
)

// Tool: publicar mensagem no realtime-server (SSE)
mcp.registerTool(
  'publish_notification',
  {
    title: 'Publicar notificação',
    description: 'Publica uma mensagem para todos os usuários conectados no front (via realtime-server).',
    inputSchema: z.object({
      message: z.string().min(1),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
  },
  async (args) => {
    await publishRealtime('/message', { message: args.message })
    return { structuredContent: { ok: true } }
  },
)

// Servidor HTTP do MCP (Streamable HTTP transport)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
})

await mcp.connect(transport)

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (url.pathname !== '/mcp') {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, message: 'Not found' }))
    return
  }

  const parsedBody = req.method === 'POST' ? await readJson(req) : undefined
  await transport.handleRequest(req, res, parsedBody)
})

server.listen(MCP_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[MCP] Server Streamable HTTP em http://localhost:${MCP_PORT}/mcp`)
})

