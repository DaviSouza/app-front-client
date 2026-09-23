#!/usr/bin/env bash
# Build da imagem front-client (VITE_* do .env) → push ECR → sync S3 via CDK.
#
# Uso:
#   ./scripts/deploy-front-s3.sh
#   npm run deploy:s3
#
# Variáveis opcionais:
#   AWS_REGION=sa-east-1
#   AWS_ACCOUNT=514673413166
#   IMAGE_TAG=latest
#   CDK_APP_DIR=~/Documentos/github/app-cdk-simple
#   SKIP_PUSH=1      # só build local
#   SKIP_CDK=1       # só build + push

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CDK_DIR="${CDK_APP_DIR:-$HOME/Documentos/github/app-cdk-simple}"

REGION="${AWS_REGION:-sa-east-1}"
ACCOUNT="${AWS_ACCOUNT:-514673413166}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REPO="front-client"
IMAGE="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${REPO}:${IMAGE_TAG}"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

ENV_FILE="$FRONT_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: .env não encontrado em $ENV_FILE" >&2
  exit 1
fi

echo "==> Carregando VITE_* e COGNITO_* de $ENV_FILE"
set -a
# shellcheck disable=SC1090
source <(grep -E '^(VITE_|COGNITO_)' "$ENV_FILE" | sed 's/\r$//')
set +a

for var in VITE_API_GATEWAY_URL COGNITO_AUTHORITY COGNITO_CLIENT_ID; do
  if [[ -z "${!var:-}" ]]; then
    echo "Erro: $var não definido no .env" >&2
    exit 1
  fi
done

echo "==> VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL"
echo "==> COGNITO_AUTHORITY=$COGNITO_AUTHORITY"
echo "==> COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID"

# SSE: CloudFront (HTTPS). POST realtime: API Gateway.
if [[ -z "${VITE_REALTIME_SSE_URL:-}" ]]; then
  FRONT_URL="$(aws cloudformation describe-stacks --stack-name AppS3Stack --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='FrontUrl'].OutputValue" --output text 2>/dev/null || true)"
  if [[ -n "$FRONT_URL" && "$FRONT_URL" != "None" ]]; then
    VITE_REALTIME_SSE_URL="${FRONT_URL%/}/realtime/events"
    echo "==> VITE_REALTIME_SSE_URL (auto CloudFront)=$VITE_REALTIME_SSE_URL"
  fi
fi
if [[ -z "${VITE_REALTIME_HTTP_URL:-}" && -n "${VITE_API_GATEWAY_URL:-}" ]]; then
  VITE_REALTIME_HTTP_URL="${VITE_API_GATEWAY_URL%/}/realtime"
  echo "==> VITE_REALTIME_HTTP_URL (auto API GW)=$VITE_REALTIME_HTTP_URL"
fi

echo "==> Docker build: $IMAGE"
cd "$FRONT_DIR"
BUILD_ARGS=(
  --build-arg "VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL"
  --build-arg "COGNITO_AUTHORITY=$COGNITO_AUTHORITY"
  --build-arg "COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID"
)
if [[ -n "${VITE_REALTIME_SSE_URL:-}" ]]; then
  BUILD_ARGS+=(--build-arg "VITE_REALTIME_SSE_URL=$VITE_REALTIME_SSE_URL")
fi
if [[ -n "${VITE_REALTIME_HTTP_URL:-}" ]]; then
  BUILD_ARGS+=(--build-arg "VITE_REALTIME_HTTP_URL=$VITE_REALTIME_HTTP_URL")
fi

docker build -t "$IMAGE" "${BUILD_ARGS[@]}" .

if [[ "${SKIP_PUSH:-}" == "1" ]]; then
  echo "==> SKIP_PUSH=1 — push ignorado."
  exit 0
fi

echo "==> Login ECR ($REGISTRY)"
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Docker push: $IMAGE"
docker push "$IMAGE"

if [[ "${SKIP_CDK:-}" == "1" ]]; then
  echo "==> SKIP_CDK=1 — deploy S3 ignorado."
  exit 0
fi

if [[ ! -d "$CDK_DIR" ]]; then
  echo "Erro: pasta CDK não encontrada: $CDK_DIR" >&2
  echo "Defina CDK_APP_DIR com o caminho de app-cdk-simple." >&2
  exit 1
fi

echo "==> CDK deploy AppS3Stack (runFrontDeploy=true, frontImageTag=$IMAGE_TAG)"
cd "$CDK_DIR"
if [[ "$IMAGE_TAG" == "latest" ]]; then
  cdk deploy AppS3Stack -c runFrontDeploy=true --require-approval never
else
  cdk deploy AppS3Stack -c runFrontDeploy=true -c "frontImageTag=$IMAGE_TAG" --require-approval never
fi

echo ""
echo "==> Concluído. URL do front:"
aws cloudformation describe-stacks --stack-name AppS3Stack --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontUrl'].OutputValue" --output text 2>/dev/null || true
