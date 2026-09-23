#!/bin/sh
set -eu

export REALTIME_HTTP_URL="${REALTIME_HTTP_URL:-http://127.0.0.1:8787/realtime}"
export MCP_URL="${MCP_URL:-http://127.0.0.1:8899/mcp}"

echo "[insights] REALTIME_HTTP_URL=$REALTIME_HTTP_URL"
echo "[insights] MCP_URL=$MCP_URL"
echo "[insights] CLIENTES_API_URL=${CLIENTES_API_URL:-}"

node /app/realtime-server.js &
REALTIME_PID=$!

node /app/mcp-insights-server.js &
MCP_PID=$!

shutdown() {
  echo "[insights] encerrando..."
  kill "$REALTIME_PID" "$MCP_PID" 2>/dev/null || true
  wait "$REALTIME_PID" "$MCP_PID" 2>/dev/null || true
}
trap shutdown TERM INT

# Runner em foreground (mantém o container vivo)
exec node /app/mcp-insights-runner.js
