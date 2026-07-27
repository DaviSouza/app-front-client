/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_URL?: string
  /** Se "true", em dev o front chama o API Gateway direto (sem proxy do Vite). */
  readonly VITE_DEV_DIRECT_API?: string
  readonly VITE_COGNITO_AUTHORITY?: string
  readonly VITE_COGNITO_CLIENT_ID?: string
  /** SSE HTTPS (CloudFront {FrontUrl}/realtime/events). Não usar execute-api — timeout 30s. */
  readonly VITE_REALTIME_SSE_URL?: string
  /** POST publish via API Gateway ({HttpApiUrl}/realtime). Opcional; deriva de VITE_API_GATEWAY_URL. */
  readonly VITE_REALTIME_HTTP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
