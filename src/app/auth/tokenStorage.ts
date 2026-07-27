import type { AuthSession, AuthTokens } from '@/app/auth/types'

const STORAGE_KEY = 'app.auth.session'

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed.accessToken || !parsed.refreshToken) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(tokens: AuthTokens, email: string | null): AuthSession {
  const session: AuthSession = {
    ...tokens,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    email,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('auth:session-cleared'))
}

export function isSessionExpired(session: AuthSession, skewMs = 60_000): boolean {
  return Date.now() >= session.expiresAt - skewMs
}

export function getStoredAccessToken(): string | null {
  return loadSession()?.accessToken ?? null
}
