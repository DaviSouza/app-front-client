import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { authRepository } from '@/app/auth/authRepository'
import type { AuthSession, AuthTokens, AuthUser } from '@/app/auth/types'
import {
  clearSession,
  isSessionExpired,
  loadSession,
  saveSession,
} from '@/app/auth/tokenStorage'
import { validateAccessToken, validateSessionToken } from '@/app/auth/tokenValidation'

type AuthContextValue = {
  isLoading: boolean
  isAuthenticated: boolean
  userEmail: string | null
  login: (emailOrLogin: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function establishSession(
  tokens: AuthTokens,
  emailHint?: string | null,
  backendUser?: AuthUser | null,
): Promise<AuthSession | null> {
  const userInfo = await validateSessionToken(
    tokens.accessToken,
    tokens.idToken,
    backendUser,
  )
  if (!userInfo?.email && !emailHint) return null

  const email = userInfo?.email ?? emailHint ?? null
  return saveSession(tokens, email)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<AuthSession | null>(null)

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const current = loadSession()
    if (!current?.refreshToken) return false

    try {
      const tokens = await authRepository.refresh({ refreshToken: current.refreshToken })
      const next = await establishSession(tokens, current.email, null)
      if (!next) {
        clearSession()
        setSession(null)
        return false
      }
      setSession(next)
      return true
    } catch {
      clearSession()
      setSession(null)
      return false
    }
  }, [])

  const bootstrap = useCallback(async () => {
    setIsLoading(true)
    try {
      const stored = loadSession()
      if (!stored) {
        setSession(null)
        return
      }

      if (!isSessionExpired(stored)) {
        const userInfo = await validateSessionToken(stored.accessToken, stored.idToken)
        if (userInfo) {
          setSession({
            ...stored,
            email: userInfo.email ?? stored.email,
          })
          return
        }
      }

      const refreshed = await refreshSession()
      if (!refreshed) setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [refreshSession])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onCleared = () => setSession(null)
    window.addEventListener('auth:session-cleared', onCleared)
    return () => window.removeEventListener('auth:session-cleared', onCleared)
  }, [])

  const login = useCallback(async (emailOrLogin: string, password: string) => {
    const response = await authRepository.login({ emailOrLogin, password })
    const { user, ...tokens } = response
    const emailHint = user?.email ?? (emailOrLogin.includes('@') ? emailOrLogin : null)
    const next = await establishSession(tokens, emailHint, user ?? null)
    if (!next) {
      throw new Error(
        'Token retornado pelo backend é inválido no Cognito. Verifique COGNITO_CLIENT_ID e COGNITO_AUTHORITY no build do front.',
      )
    }
    setSession(next)
  }, [])

  const logout = useCallback(async () => {
    const accessToken = session?.accessToken ?? loadSession()?.accessToken
    if (accessToken) {
      try {
        await authRepository.logout(accessToken)
      } catch {
        // ignora falha de logout remoto
      }
    }
    clearSession()
    setSession(null)
  }, [session?.accessToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(session?.accessToken),
      userEmail: session?.email ?? null,
      login,
      logout,
      refreshSession,
    }),
    [isLoading, session, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return ctx
}

export async function getValidAccessToken(): Promise<string | null> {
  const stored = loadSession()
  if (!stored) return null

  if (!isSessionExpired(stored)) {
    const valid = await validateAccessToken(stored.accessToken)
    if (valid) return stored.accessToken
  }

  if (!stored.refreshToken) {
    clearSession()
    return null
  }

  try {
    const tokens = await authRepository.refresh({ refreshToken: stored.refreshToken })
    const next = await establishSession(tokens, stored.email, null)
    return next?.accessToken ?? null
  } catch {
    clearSession()
    return null
  }
}
