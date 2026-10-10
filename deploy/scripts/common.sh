#!/usr/bin/env bash
set -euo pipefail
DEPLOY_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  echo 'Önce deploy/.env.example dosyasını deploy/.env olarak kopyalayıp doldurun.' >&2
  exit 1
fi
# Trusted operator configuration; CI writes this with shell quoting.
set -a
source "$DEPLOY_DIR/.env"
QUIZ_DOMAIN="${QUIZ_DOMAIN:-iettquiz.duckdns.org}"
SITE_URL="https://$QUIZ_DOMAIN"
DEPLOY_MODE="${DEPLOY_MODE:-offline}"
EDGE_CONTAINER="${EDGE_CONTAINER:-nginx}"
EDGE_STACK_DIR="${EDGE_STACK_DIR:-$HOME/docker-app}"
EDGE_NETWORK="${EDGE_NETWORK:-auto}"
set +a
python3 "$DEPLOY_DIR/scripts/configure.py" --check
case "$DEPLOY_MODE" in
  server) compose_profile=(--profile server) ;;
  offline) compose_profile=() ;;
esac
compose() { docker compose --project-name son-durak --env-file "$DEPLOY_DIR/.env" -f "$DEPLOY_DIR/compose.yml" "${compose_profile[@]}" "$@"; }
edge_compose() { (cd "$EDGE_STACK_DIR" && docker compose "$@"); }
resolve_edge() {
  local network label
  local -a networks=() candidates=()
  [[ "$(docker inspect --format '{{.State.Running}}' "$EDGE_CONTAINER")" == true ]] || { echo 'Mevcut edge nginx çalışmıyor.' >&2; return 1; }
  mapfile -t networks < <(docker inspect --format '{{range $name, $value := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$EDGE_CONTAINER" | sed '/^$/d')
  if [[ "$EDGE_NETWORK" == auto ]]; then
    for network in "${networks[@]}"; do
      label="$(docker network inspect --format '{{index .Labels "com.docker.compose.network"}}' "$network")"
      if [[ "$label" == app-network ]]; then candidates+=("$network"); fi
    done
    if [[ ${#candidates[@]} == 1 ]]; then EDGE_NETWORK="${candidates[0]}"
    elif [[ ${#networks[@]} == 1 ]]; then EDGE_NETWORK="${networks[0]}"
    else echo 'Nginx ağı belirsiz; EDGE_NETWORK değişkenine gerçek ağ adını yazın.' >&2; return 1; fi
  fi
  for network in "${networks[@]}"; do
    if [[ "$network" == "$EDGE_NETWORK" ]]; then export EDGE_NETWORK; return 0; fi
  done
  echo "Nginx, EDGE_NETWORK=$EDGE_NETWORK ağına bağlı değil." >&2; return 1
}
