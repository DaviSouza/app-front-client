#!/usr/bin/env node
/**
 * Runner (cliente MCP) que a cada 30s:
 * - Lê clientes do resource `clientes://all` no servidor MCP
 * - Calcula:
 *   - maioria por gênero (M/F)
 *   - domínio de e-mail mais usado
 *   - geração majoritária (Baby Boomers, Millennials, Geração Z)
 * - Publica as mensagens no realtime-server via tool `publish_notification`
 *
 * Variáveis:
 * - MCP_URL: URL do endpoint MCP (default http://localhost:8899/mcp)
 * - INTERVAL_MS: intervalo (default 30000)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = process.env.MCP_URL ?? 'http://localhost:8899/mcp'
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 30000)

function parseClientes(jsonText) {
  const data = JSON.parse(jsonText)
  return Array.isArray(data) ? data : []
}

function getEmailDomain(email) {
  if (typeof email !== 'string') return ''
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return ''
  return email.slice(at + 1).trim().toLowerCase()
}

function yearFromDateString(s) {
  if (typeof s !== 'string') return null
  // aceita "YYYY-MM-DD" (como no form)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  return Number.isFinite(y) ? y : null
}

function generationFromBirthYear(year) {
  if (!Number.isFinite(year)) return null
  if (year >= 1946 && year <= 1964) return 'Baby Boomers'
  if (year >= 1981 && year <= 1996) return 'Millennials'
  if (year >= 1997 && year <= 2012) return 'Geração Z'
  return null
}

function mostCommon(map) {
  let bestKey = ''
  let bestVal = 0
  for (const [k, v] of map.entries()) {
    if (v > bestVal) {
      bestVal = v
      bestKey = k
    }
  }
  return bestVal > 0 ? { key: bestKey, value: bestVal } : null
}

function computeInsights(clientes) {
  let totalM = 0
  let totalF = 0

  /** @type {Map<string, number>} */
  const domainCount = new Map()
  /** @type {Map<string, number>} */
  const genCount = new Map()

  for (const c of clientes) {
    const genero = c?.genero
    if (genero === 'M') totalM++
    if (genero === 'F') totalF++

    const domain = getEmailDomain(c?.email)
    if (domain) domainCount.set(domain, (domainCount.get(domain) ?? 0) + 1)

    const year = yearFromDateString(c?.data_nascimento)
    if (year) {
      const g = generationFromBirthYear(year)
      if (g) genCount.set(g, (genCount.get(g) ?? 0) + 1)
    }
  }

  const messages = []

  if (totalF > totalM) {
    messages.push(`Clube da luluzinha on. Mulhereada são maioria. São ${totalF}`)
  } else if (totalM > totalF) {
    messages.push(`Clube do bolinha on. Homens são maioria. São ${totalM}`)
  }

  const topDomain = mostCommon(domainCount)
  if (topDomain) {
    const label = topDomain.key.split('.')[0]?.toUpperCase?.() ? topDomain.key : topDomain.key
    messages.push(`${label} é mail mais usado no cadastro`)
  }

  const topGen = mostCommon(genCount)
  if (topGen) {
    messages.push(`${topGen.key} é a maior por aqui`)
  }

  return messages
}

async function publishAll(client, messages) {
  for (const message of messages) {
    await client.callTool({
      name: 'publish_notification',
      arguments: { message },
    })
  }
}

async function readClientesFromResource(client) {
  const res = await client.readResource({ uri: 'clientes://all' })
  const item = res.contents?.[0]
  const text = item?.text
  if (typeof text !== 'string') return []
  return parseClientes(text)
}

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
  const client = new Client({ name: 'app-front-client-insights-runner', version: '1.0.0' })
  await client.connect(transport)

  // eslint-disable-next-line no-console
  console.log(`[Runner] conectado em ${MCP_URL}; intervalo=${INTERVAL_MS}ms`)

  /** @type {string[]} */
  let queue = []

  const refillQueue = async () => {
    const clientes = await readClientesFromResource(client)
    queue = computeInsights(clientes)
  }

  const tick = async () => {
    try {
      if (queue.length === 0) {
        await refillQueue()
      }

      const next = queue.shift()
      if (!next) return

      await publishAll(client, [next])
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Runner] erro:', e instanceof Error ? e.message : e)
    }
  }

  await tick()
  setInterval(() => void tick(), INTERVAL_MS)
}

main()

