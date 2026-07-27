import { getValidAccessToken } from '@/app/auth/AuthContext'
import { clearSession } from '@/app/auth/tokenStorage'
import { apiUrl } from '@/shared/http/apiBase'

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path)
  const headers = new Headers(init?.headers)

  if (!headers.has('Authorization')) {
    const token = await getValidAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, { ...init, headers })

  if (res.status === 401) {
    clearSession()
  }

  return res
}
