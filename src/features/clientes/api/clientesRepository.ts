import type { Cliente, ClienteUpdate } from '@/features/clientes/model/cliente'

import { authFetch } from '@/shared/http/authFetch'
import { readJsonOrThrow } from '@/shared/http/readJsonOrThrow'

export type ClienteCreate = Omit<Cliente, 'id'>

export const clientesRepository = {
  async list(): Promise<Cliente[]> {
    const res = await authFetch('/clientes', { method: 'GET' })
    const data = await readJsonOrThrow<unknown>(res)
    if (Array.isArray(data)) return data as Cliente[]
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      const candidates = [obj.clientes, obj.data, obj.items, obj.result]
      for (const c of candidates) {
        if (Array.isArray(c)) return c as Cliente[]
      }
    }
    throw new Error('Formato inesperado na listagem de clientes.')
  },

  async create(data: ClienteCreate): Promise<Cliente> {
    const res = await authFetch('/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return await readJsonOrThrow<Cliente>(res)
  },

  async getById(id: string): Promise<Cliente> {
    const res = await authFetch(`/clientes/${encodeURIComponent(id)}`, {
      method: 'GET',
    })
    return await readJsonOrThrow<Cliente>(res)
  },

  async update(id: string, data: ClienteUpdate): Promise<Cliente> {
    const res = await authFetch(`/clientes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return await readJsonOrThrow<Cliente>(res)
  },

  async remove(id: string): Promise<void> {
    const res = await authFetch(`/clientes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      await readJsonOrThrow<unknown>(res)
    }
  },
}
