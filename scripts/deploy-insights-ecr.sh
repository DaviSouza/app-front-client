#!/usr/bin/env bash
# Build e push da imagem front-insights (realtime + MCP + runner) para o ECR.
#
# Uso:
#   ./scripts/deploy-insights-ecr.sh
#
# Antes do primeiro push, crie o repositório ECR:
#   cd ../app-cdk-simple && npm run build && cdk deploy AppEcrStack --require-approval never
#
# Depois do push:
#   cdk deploy AppInsightsStack -c insightsServiceEmail=... -c insightsServicePassword=... -c corsOrigin=...

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

REGION="${AWS_REGION:-sa-east-1}"
ACCOUNT="${AWS_ACCOUNT:-514673413166}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REPO="front-insights"
IMAGE="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${REPO}:${IMAGE_TAG}"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

echo "==> Docker build (Dockerfile.insights): $IMAGE"
cd "$FRONT_DIR"
docker build -f Dockerfile.insights -t "$IMAGE" .

if ! aws ecr describe-repositories --repository-names "$REPO" --region "$REGION" >/dev/null 2>&1; then
  echo "Erro: repositório ECR '$REPO' não existe na conta $ACCOUNT ($REGION)." >&2
  echo "Crie com: cd ../app-cdk-simple && npm run build && cdk deploy AppEcrStack --require-approval never" >&2
  exit 1
fi

echo "==> Login ECR"
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Push"
docker push "$IMAGE"

echo ""
echo "==> Próximo passo (CDK):"
echo "cd ~/Documentos/github/app-cdk-simple"
echo "npm run build"
echo "cdk deploy AppEcrStack AppInsightsStack \\"
echo "  -c insightsServiceEmail=teste03@t.com \\"
echo "  -c insightsServicePassword=Teste03# \\"
echo "  -c corsOrigin=https://d1uflsgqau43lf.cloudfront.net"
