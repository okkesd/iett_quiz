#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
api_base=''
if [[ "$DEPLOY_MODE" == server ]]; then
  api_base=/api
  docker build --file "$PROJECT_DIR/backend/Dockerfile" --tag "$IMAGE_PREFIX/son-durak-api:$RELEASE_TAG" "$PROJECT_DIR"
fi
docker build --file "$PROJECT_DIR/frontend/Dockerfile" --tag "$IMAGE_PREFIX/son-durak-web:$RELEASE_TAG" \
  --build-arg "SITE_URL=$SITE_URL" --build-arg "API_BASE_URL=$api_base" --build-arg AUTH_MODE=supabase \
  --build-arg "SUPABASE_URL=${SUPABASE_URL:-}" --build-arg "SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY:-}" "$PROJECT_DIR"
if [[ "${1:-}" == --push ]]; then
  if [[ "$DEPLOY_MODE" == server ]]; then docker push "$IMAGE_PREFIX/son-durak-api:$RELEASE_TAG"; fi
  docker push "$IMAGE_PREFIX/son-durak-web:$RELEASE_TAG"
fi
