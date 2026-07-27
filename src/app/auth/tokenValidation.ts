import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { getCognitoAuthority, getCognitoClientId } from '@/shared/http/apiBase'
import type { AuthUser, CognitoUserInfo } from '@/app/auth/types'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
let userInfoEndpoint: string | null = null

function authority(): string {
  const value = getCognitoAuthority()
  if (!value) throw new Error('VITE_COGNITO_AUTHORITY não configurado.')
  return value
}

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${authority()}/.well-known/jwks.json`))
  }
  return jwks
}

function tokenMatchesClient(payload: JWTPayload, clientId: string): boolean {
  if (payload.token_use === 'access') {
    if (payload.client_id === clientId) return true
    return false
  }

  if (payload.token_use === 'id') {
    const aud = payload.aud
    if (typeof aud === 'string') return aud === clientId
    if (Array.isArray(aud)) return aud.some((a) => a === clientId)
  }

  return false
}

async function resolveUserInfoEndpoint(): Promise<string> {
  if (userInfoEndpoint) return userInfoEndpoint

  const res = await fetch(`${authority()}/.well-known/openid-configuration`)
  if (res.ok) {
    const data = (await res.json()) as { userinfo_endpoint?: string }
    if (data.userinfo_endpoint) {
      userInfoEndpoint = data.userinfo_endpoint
      return userInfoEndpoint
    }
  }

  userInfoEndpoint = `${authority()}/oauth2/userInfo`
  return userInfoEndpoint
}

function userInfoFromIdPayload(payload: JWTPayload): CognitoUserInfo {
  return {
    sub: typeof payload.sub === 'string' ? payload.sub : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    email_verified:
      typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    username: typeof payload['cognito:username'] === 'string' ? payload['cognito:username'] : undefined,
  }
}

export async function validateAccessToken(accessToken: string): Promise<boolean> {
  const clientId = getCognitoClientId()
  if (!clientId) return false

  try {
    const { payload } = await jwtVerify(accessToken, getJwks(), {
      issuer: authority(),
    })

    if (payload.token_use !== 'access') return false
    return tokenMatchesClient(payload, clientId)
  } catch {
    return false
  }
}

async function validateIdToken(idToken: string): Promise<CognitoUserInfo | null> {
  const clientId = getCognitoClientId()
  if (!clientId) return null

  try {
    const { payload } = await jwtVerify(idToken, getJwks(), {
      issuer: authority(),
    })

    if (payload.token_use !== 'id') return null
    if (!tokenMatchesClient(payload, clientId)) return null

    return userInfoFromIdPayload(payload)
  } catch {
    return null
  }
}

export async function fetchUserInfo(accessToken: string): Promise<CognitoUserInfo | null> {
  try {
    const endpoint = await resolveUserInfoEndpoint()
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return (await res.json()) as CognitoUserInfo
  } catch {
    return null
  }
}

export async function validateSessionToken(
  accessToken: string,
  idToken?: string,
  backendUser?: AuthUser | null,
): Promise<CognitoUserInfo | null> {
  const accessOk = await validateAccessToken(accessToken)
  if (!accessOk) return null

  if (idToken) {
    const fromId = await validateIdToken(idToken)
    if (fromId?.email) return fromId
  }

  const fromUserInfo = await fetchUserInfo(accessToken)
  if (fromUserInfo?.email) return fromUserInfo

  if (backendUser?.email) {
    return {
      email: backendUser.email,
      name: backendUser.nome,
      username: backendUser.login,
    }
  }

  return null
}
