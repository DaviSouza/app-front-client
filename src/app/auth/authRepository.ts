import type {
  AuthTokens,
  AuthUser,
  LoginResponse,
  RegisterClientePayload,
} from '@/app/auth/types'
import { apiUrl } from '@/shared/http/apiBase'
import { HttpResponseError, readJsonOrThrow } from '@/shared/http/readJsonOrThrow'

type MessageResponse = { message?: string }

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = apiUrl(path)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    const hint = import.meta.env.DEV
      ? ' Verifique se o servidor de desenvolvimento está rodando (npm run dev) e se VITE_API_GATEWAY_URL no .env aponta para o API Gateway correto (saída HttpApiUrl do CDK).'
      : ' Verifique VITE_API_GATEWAY_URL e a conectividade com o API Gateway.'
    throw new Error(`Não foi possível conectar à API de autenticação (${path}).${hint}`)
  }

  try {
    return await readJsonOrThrow<T>(res)
  } catch (err) {
    if (err instanceof HttpResponseError && !err.details?.url) {
      throw new HttpResponseError(err.message, err.status, { ...err.details, url })
    }
    throw err
  }
}

export const authRepository = {
  register(data: RegisterClientePayload) {
    return postJson<AuthUser>('/auth/register', data)
  },

  login(data: { emailOrLogin: string; password: string }) {
    return postJson<LoginResponse>('/auth/login', data)
  },

  refresh(data: { refreshToken: string }) {
    return postJson<AuthTokens>('/auth/refresh', data)
  },

  logout(accessToken: string) {
    return postJson<MessageResponse>('/auth/logout', { accessToken })
  },

  forgotPassword(data: { email: string }) {
    return postJson<MessageResponse>('/auth/forgot-password', data)
  },

  resetPassword(data: { email: string; code: string; newPassword: string }) {
    return postJson<MessageResponse>('/auth/reset-password', data)
  },
}
