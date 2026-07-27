import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'app-front-client:auth'
const AUTH_EXPIRED_EVENT = 'app-front-client:auth-expired'

export type AuthToken = {
  accessToken: string
  tokenType: string
  expiresIn: string
  expiresAt: string
}

type AuthState = {
  token: AuthToken | null
  userEmail?: string | null
}

function readState(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { token: null, userEmail: null }
  try {
    const parsed = JSON.parse(raw) as AuthState
    if (!parsed || typeof parsed !== 'object') return { token: null, userEmail: null }
    const t = (parsed as AuthState).token
    const userEmailRaw = (parsed as AuthState).userEmail
    const userEmail =
      typeof userEmailRaw === 'string' && userEmailRaw.trim() ? userEmailRaw.trim() : null
    if (!t) return { token: null, userEmail }
    if (
      typeof t.accessToken !== 'string' ||
      typeof t.tokenType !== 'string' ||
      typeof t.expiresIn !== 'string' ||
      typeof t.expiresAt !== 'string'
    ) {
      return { token: null, userEmail }
    }
    return { token: t, userEmail }
  } catch {
    return { token: null, userEmail: null }
  }
}

function writeState(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export type LoginPayload = {
  email: string
  senha: string
}

export type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresIn: number
}

const CLIENT_ID = '9f1a0c66bb2d458ec1efaf4d42aa1d18'

function parseExpiresInSeconds(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw !== 'string') return NaN

  const s = raw.trim().toLowerCase()
  if (!s) return NaN

  // "300" (segundos)
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)

  // "5m", "30s", "1h"
  const m = /^(\d+(\.\d+)?)(s|m|h)$/.exec(s)
  if (!m) return NaN

  const value = Number(m[1])
  if (!Number.isFinite(value)) return NaN

  const unit = m[3]
  if (unit === 's') return value
  if (unit === 'm') return value * 60
  if (unit === 'h') return value * 60 * 60
  return NaN
}

async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch('/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      senha: payload.senha,
      client_id: CLIENT_ID,
    }),
  })

  if (!res.ok) {
    let message = `Falha no login (HTTP ${res.status}).`
    try {
      const data = (await res.json()) as unknown
      if (data && typeof data === 'object' && 'message' in data) {
        const m = (data as { message?: unknown }).message
        if (typeof m === 'string' && m.trim()) message = m
      }
    } catch {
      // ignora parsing
    }
    throw new Error(message)
  }

  const data = (await res.json()) as unknown
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida do servidor de autenticação.')
  }

  const obj = data as Record<string, unknown>
  const accessToken = typeof obj.accessToken === 'string' ? obj.accessToken.trim() : ''
  const tokenType = typeof obj.tokenType === 'string' ? obj.tokenType.trim() : ''

  const expiresInRaw = obj.expiresIn ?? obj.expires_in
  const expiresInNum = parseExpiresInSeconds(expiresInRaw)

  if (!accessToken || !Number.isFinite(expiresInNum)) {
    throw new Error('Resposta inválida do servidor de autenticação.')
  }

  return { accessToken, tokenType, expiresIn: expiresInNum }
}

type AuthContextValue = {
  token: AuthToken | null
  isAuthenticated: boolean
  userEmail: string | null
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  loginOpen: boolean
  loginRedirectTo: string | null
  openLogin: (redirectTo?: string) => void
  closeLogin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<AuthToken | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginRedirectTo, setLoginRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    const { token: stored, userEmail: storedEmail } = readState()
    setToken(stored)
    setUserEmail(storedEmail ?? null)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUserEmail(null)
    writeState({ token: null, userEmail: null })
    setLoginOpen(false)
    setLoginRedirectTo(null)
  }, [])

  useEffect(() => {
    const onExpired = () => {
      logout()
      setLoginOpen(true)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const { token: stored, userEmail: storedEmail } = readState()
      setToken(stored)
      setUserEmail(storedEmail ?? null)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
      window.removeEventListener('storage', onStorage)
    }
  }, [logout])

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await loginRequest(payload)
    const now = Date.now()
    const expiresInSec = Math.max(1, Math.trunc(res.expiresIn))
    const next: AuthToken = {
      accessToken: res.accessToken,
      tokenType: res.tokenType,
      expiresIn: String(expiresInSec),
      expiresAt: String(now + expiresInSec * 1000),
    }
    setToken(next)
    setUserEmail(payload.email.trim())
    writeState({ token: next, userEmail: payload.email.trim() })
    setLoginOpen(false)
  }, [])

  const isAuthenticated = useMemo(() => {
    if (!token?.accessToken) return false
    if (typeof token.expiresAt !== 'string') return false
    const expiresAtMs = Number(token.expiresAt)
    if (!Number.isFinite(expiresAtMs)) return false
    return expiresAtMs > Date.now()
  }, [token])

  const value = useMemo<AuthContextValue>(() => {
    return {
      token,
      isAuthenticated,
      userEmail,
      login,
      logout,
      loginOpen,
      loginRedirectTo,
      openLogin: (redirectTo?: string) => {
        setLoginOpen(true)
        if (typeof redirectTo === 'string' && redirectTo.trim()) {
          setLoginRedirectTo(redirectTo)
        }
      },
      closeLogin: () => {
        setLoginOpen(false)
        setLoginRedirectTo(null)
      },
    }
  }, [token, isAuthenticated, userEmail, login, logout, loginOpen, loginRedirectTo])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

