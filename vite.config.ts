import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiGateway =
    env.VITE_API_GATEWAY_URL?.trim() ||
    'https://odadp9ntx0.execute-api.us-east-1.amazonaws.com'

  return {
    // Expõe VITE_* e COGNITO_* no import.meta.env (client bundle).
    envPrefix: ['VITE_', 'COGNITO_'],
    plugins: [react()],
    server: {
      proxy: {
        '/auth': {
          target: apiGateway,
          changeOrigin: true,
          secure: true,
        },
        '/clientes': {
          target: apiGateway,
          changeOrigin: true,
          secure: true,
        },
        '/realtime': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
