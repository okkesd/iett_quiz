#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
# Serialize manual runs too. Only this project's services are managed here.
exec 9>"$DEPLOY_DIR/.deploy.lock"
flock -n 9 || { echo 'Başka bir Son Durak deploy işlemi çalışıyor.' >&2; exit 1; }
resolve_edge
config="$EDGE_STACK_DIR/nginx/son-durak/site.conf"
[[ -f "$config" ]] && grep -Fq "server_name $QUIZ_DOMAIN;" "$config" && grep -q 'listen 443 ssl' "$config" || {
  echo 'Önce install-edge.sh bootstrap, Certbot ve install-edge.sh https adımlarını tamamlayın (deploy/README.md).' >&2; exit 1;
}
docker exec "$EDGE_CONTAINER" test -r /etc/nginx/conf.d/son-durak.conf
docker exec "$EDGE_CONTAINER" nginx -t
# Runtime DNS on the edge makes reloading/restarting Club Events unnecessary.
compose config --quiet
compose pull
existing_api="$(docker compose --project-name son-durak --env-file "$DEPLOY_DIR/.env" -f "$DEPLOY_DIR/compose.yml" --profile server ps -q api)"
if [[ -n "$existing_api" ]]; then
  # Backup before migrations OR switching to browser-only mode.
  DEPLOY_BACKUP=1 bash "$DEPLOY_DIR/scripts/backup.sh"
fi
if [[ "$DEPLOY_MODE" == server ]]; then
  compose up -d --wait --wait-timeout 180 api
else
  docker compose --project-name son-durak --env-file "$DEPLOY_DIR/.env" -f "$DEPLOY_DIR/compose.yml" --profile server stop api
fi
compose up -d --wait --wait-timeout 120 web
# Check the virtual host through the existing public edge, including certificate.
curl --fail --silent --show-error --retry 8 --retry-delay 3 --retry-all-errors --max-time 15 \
  --resolve "$QUIZ_DOMAIN:443:127.0.0.1" "$SITE_URL/healthz" >/dev/null
if [[ "$DEPLOY_MODE" == server ]]; then
  curl --fail --silent --show-error --retry 8 --retry-delay 3 --retry-all-errors --max-time 15 \
    --resolve "$QUIZ_DOMAIN:443:127.0.0.1" "$SITE_URL/api/health/ready" >/dev/null
fi
cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/.env.last-successful"
chmod 600 "$DEPLOY_DIR/.env.last-successful"
printf 'Yayın hazır: %s (sürüm: %s, mod: %s)\n' "$SITE_URL" "$RELEASE_TAG" "$DEPLOY_MODE"
