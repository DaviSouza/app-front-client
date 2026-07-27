#!/usr/bin/env node
/**
 * Realtime Notifications Server (SSE) para o app-front-client.
 *
 * - GET  /realtime/events
 *     Stream SSE com eventos no formato: { type, event }
 * - POST /realtime/cliente-cadastrado
 *     Body JSON: { nome: string }
 * - POST /realtime/clientes-importados
 *     Body JSON: { total: number }
 * - POST /realtime/message
 *     Body JSON: { message: string }
 *
 * Compatibilidade:
 * - Mantém /mcp/* como alias para /realtime/*
 *
 * Variáveis:
 * - PORT: porta do servidor (default 8787)
 * - CORS_ORIGIN: origem permitida no CORS (default "*")
 */

import http from 'node:http'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT ?? 8787)
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*'

/** @type {Set<import('node:http').ServerResponse>} */
const sseClients = new Set()

function sendSse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function broadcast(data) {
  for (const res of sseClients) {
    try {
      sendSse(res, data)
    } catch {
      try {
        res.end()
      } catch {
        // ignore
      }
      sseClients.delete(res)
    }
  }
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function writeJson(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.end(JSON.stringify(body))
}

function writeCorsPreflight(res) {
  res.statusCode = 204
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.end()
}

function normalizePathname(pathname) {
  if (pathname.startsWith('/mcp/')) return pathname.replace('/mcp/', '/realtime/')
  if (pathname === '/mcp/events') return '/realtime/events'
  return pathname
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const pathname = normalizePathname(url.pathname)

    if (method === 'OPTIONS') return writeCorsPreflight(res)

    if (method === 'GET' && pathname === '/health') {
      return writeJson(res, 200, { ok: true })
    }

    if (method === 'GET' && pathname === '/realtime/events') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
      res.setHeader('X-Accel-Buffering', 'no')

      res.write('retry: 2000\n\n')
      sendSse(res, { type: 'hello', event: { ts: Date.now() } })

      sseClients.add(res)

      const ping = setInterval(() => {
        try {
          res.write(': ping\n\n')
        } catch {
          // ignore
        }
      }, 25000)

      req.on('close', () => {
        clearInterval(ping)
        sseClients.delete(res)
      })
      return
    }

    if (method === 'POST' && pathname === '/realtime/cliente-cadastrado') {
      const body = await readJson(req)
      const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
      if (!nome) return writeJson(res, 400, { ok: false, message: 'Campo "nome" é obrigatório.' })
      broadcast({ type: 'clienteCadastrado', event: { nome, createdAt: Date.now() } })
      return writeJson(res, 200, { ok: true })
    }

    if (method === 'POST' && pathname === '/realtime/clientes-importados') {
      const body = await readJson(req)
      const totalNum = Number(body?.total)
      const total = Number.isFinite(totalNum) ? Math.max(0, Math.trunc(totalNum)) : 0
      broadcast({ type: 'clientesImportados', event: { total, createdAt: Date.now() } })
      return writeJson(res, 200, { ok: true })
    }

    if (method === 'POST' && pathname === '/realtime/message') {
      const body = await readJson(req)
      const message = typeof body?.message === 'string' ? body.message.trim() : ''
      if (!message) return writeJson(res, 400, { ok: false, message: 'Campo "message" é obrigatório.' })
      broadcast({ type: 'message', event: { message, createdAt: Date.now() } })
      return writeJson(res, 200, { ok: true })
    }

    return writeJson(res, 404, { ok: false, message: 'Not found' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return writeJson(res, 500, { ok: false, message })
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Realtime] SSE server rodando em http://localhost:${PORT}`)
  // eslint-disable-next-line no-console
  console.log('[Realtime] GET  /realtime/events   (alias: /mcp/events)')
  // eslint-disable-next-line no-console
  console.log('[Realtime] POST /realtime/cliente-cadastrado  { nome }')
  // eslint-disable-next-line no-console
  console.log('[Realtime] POST /realtime/clientes-importados  { total }')
  // eslint-disable-next-line no-console
  console.log('[Realtime] POST /realtime/message  { message }')
})

