/** URL absoluta do API Gateway (build/produção ou quando VITE_DEV_DIRECT_API=true). */
export function getApiGatewayUrl(): string {
  const raw = import.meta.env.VITE_API_GATEWAY_URL?.trim()
  if (!raw) return ''
  return raw.replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  // Em dev, rotas relativas passam pelo proxy do Vite (evita CORS e NetworkError por cross-origin).
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_DIRECT_API !== 'true') {
    return normalized
  }
  const base = getApiGatewayUrl()
  return base ? `${base}${normalized}` : normalized
}

export function getCognitoAuthority(): string {
  return import.meta.env.VITE_COGNITO_AUTHORITY?.trim().replace(/\/$/, '') ?? ''
}

export function getCognitoClientId(): string {
  return import.meta.env.VITE_COGNITO_CLIENT_ID?.trim() ?? ''
}
