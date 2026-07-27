# app-front-client

## Notificações em tempo real (SSE)

Este projeto exibe alertas no canto direito quando:
- um cliente é cadastrado: `Cliente nome_cliente cadastrado`
- uma importação é executada: `Foram importados total_importado de clientes`

### Subir o servidor de notificações

Em um terminal:

```bash
npm run realtime:server
```

O servidor sobe em `http://localhost:8787` e expõe:
- `GET /realtime/events` (SSE)
- `POST /realtime/cliente-cadastrado` body `{ "nome": "Maria" }`
- `POST /realtime/clientes-importados` body `{ "total": 42 }`

Compatibilidade:
- `GET /mcp/events` e `POST /mcp/*` funcionam como **alias** para `/realtime/*`.

### Subir o front

Em outro terminal:

```bash
npm run dev
```

No ambiente de desenvolvimento, o Vite faz proxy de `/realtime/*` para `http://localhost:8787`.

## MCP (estudo) - Insights a cada 30s

Este repo inclui um exemplo de **servidor MCP** + **runner (cliente MCP)** que a cada 30 segundos calcula insights e publica mensagens no front.

### Subir MCP + runner

Terminal 1:

```bash
npm run mcp:insights:server
```

Terminal 2:

```bash
npm run mcp:insights:runner
```

### Autenticação para ler `/clientes` (evitar 401)

O MCP server precisa conseguir chamar o backend de clientes (`CLIENTES_API_URL`).

Você pode escolher um dos jeitos:

- **Passar um token já pronto**:

```bash
CLIENTES_API_TOKEN="SEU_TOKEN" npm run mcp:insights:server
```

- **Ou deixar ele obter token via `/token` automaticamente** (mesmo fluxo do front):

```bash
AUTH_EMAIL="admin@dsmercado.com" AUTH_SENHA="admin" npm run mcp:insights:server
```

Se seu `/token` não estiver em `http://localhost:7000`, ajuste:

```bash
AUTH_API_URL="http://localhost:7000" AUTH_EMAIL="..." AUTH_SENHA="..." npm run mcp:insights:server
```

### Disparar eventos manualmente (teste)

```bash
curl -X POST "http://localhost:8787/realtime/cliente-cadastrado" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria"}'
```

```bash
curl -X POST "http://localhost:8787/realtime/clientes-importados" \
  -H "Content-Type: application/json" \
  -d '{"total":42}'
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
