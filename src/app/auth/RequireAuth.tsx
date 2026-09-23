import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/app/auth/AuthContext'
import { getApiGatewayUrl, getCognitoAuthority, getCognitoClientId } from '@/shared/http/apiBase'

const authConfigured =
  Boolean(getApiGatewayUrl() || import.meta.env.DEV) &&
  Boolean(getCognitoAuthority()) &&
  Boolean(getCognitoClientId())

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (!authConfigured) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
        Autenticação não configurada. Defina{' '}
        <code className="rounded bg-muted px-1">VITE_API_GATEWAY_URL</code>,{' '}
        <code className="rounded bg-muted px-1">COGNITO_AUTHORITY</code> e{' '}
        <code className="rounded bg-muted px-1">COGNITO_CLIENT_ID</code> no{' '}
        <code className="rounded bg-muted px-1">.env</code>.
      </div>
    )
  }

  if (auth.isLoading) return null

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
