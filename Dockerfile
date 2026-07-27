# syntax=docker/dockerfile:1

# Build da SPA (Vite + React)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_GATEWAY_URL
ARG VITE_COGNITO_AUTHORITY
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_REALTIME_SSE_URL
ARG VITE_REALTIME_HTTP_URL

ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL \
    VITE_COGNITO_AUTHORITY=$VITE_COGNITO_AUTHORITY \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_REALTIME_SSE_URL=$VITE_REALTIME_SSE_URL \
    VITE_REALTIME_HTTP_URL=$VITE_REALTIME_HTTP_URL

RUN npm run build

# Imagem final: apenas arquivos estáticos + nginx
FROM nginx:alpine AS production

RUN rm -f /etc/nginx/conf.d/default.conf

RUN <<'EOF' cat > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
