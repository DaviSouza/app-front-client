export type AuthTokens = {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export type AuthUser = {
  id: number
  nome: string
  email: string
  login: string
  data_nascimento: string
  genero: string
}

export type LoginResponse = AuthTokens & {
  user?: AuthUser
}

export type AuthSession = AuthTokens & {
  expiresAt: number
  email: string | null
}

export type CognitoUserInfo = {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  username?: string
}

export type RegisterClientePayload = {
  nome: string
  email: string
  login: string
  data_nascimento: string
  genero: string
  senha: string
}
