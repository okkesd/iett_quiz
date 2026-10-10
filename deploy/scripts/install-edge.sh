#!/usr/bin/env bash
# One-time integration / HTTPS activation, run by the server operator.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
phase="${1:-bootstrap}"
[[ "$phase" == bootstrap || "$phase" == https ]] || { echo 'Kullanım: install-edge.sh bootstrap|https' >&2; exit 1; }
resolve_edge
stack_label="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$EDGE_CONTAINER")"
[[ "$(realpath "$EDGE_STACK_DIR")" == "$(realpath "$stack_label")" ]] || {
  echo "EDGE_STACK_DIR çalışan nginx'in Compose dizini olmalı: $stack_label" >&2; exit 1;
}
config_dir="$EDGE_STACK_DIR/nginx/son-durak"
loader="$EDGE_STACK_DIR/nginx/son-durak-loader.conf"
config="$config_dir/site.conf"
# Do not overwrite any pre-existing operator override.
for override in compose.override.yaml compose.override.yml docker-compose.override.yaml docker-compose.override.yml; do
  if [[ -f "$EDGE_STACK_DIR/$override" ]]; then
    if ! edge_compose config --format json | python3 -c '
import json,sys
volumes=json.load(sys.stdin)["services"]["nginx"].get("volumes",[])
assert {"/etc/nginx/son-durak", "/etc/nginx/conf.d/son-durak.conf"} <= {v["target"] for v in volumes}
' 2>/dev/null; then
      echo "Mevcut $override korunuyor. deploy/nginx/edge.compose.override.yml içindeki iki mount'u bu dosyaya birleştirip tekrar çalıştırın." >&2
      exit 1
    fi
    break
  fi
done
if [[ ! -f "$EDGE_STACK_DIR/compose.override.yaml" && ! -f "$EDGE_STACK_DIR/compose.override.yml" && ! -f "$EDGE_STACK_DIR/docker-compose.override.yaml" && ! -f "$EDGE_STACK_DIR/docker-compose.override.yml" ]]; then
  cp "$DEPLOY_DIR/nginx/edge.compose.override.yml" "$EDGE_STACK_DIR/docker-compose.override.yml"
fi
if [[ -e "$loader" ]] && ! cmp -s "$loader" "$DEPLOY_DIR/nginx/edge-loader.conf"; then
  echo "$loader zaten var ve farklı; üzerine yazılmadı." >&2; exit 1
fi
mkdir -p "$config_dir"
chmod 755 "$config_dir"
cp "$DEPLOY_DIR/nginx/edge-loader.conf" "$loader"
chmod 644 "$loader"
# Check the effective configuration, including any operator-supplied override.
edge_compose config --format json | python3 -c '
import json,os,sys
volumes=json.load(sys.stdin)["services"]["nginx"].get("volumes",[])
expected={"/etc/nginx/son-durak":sys.argv[1],"/etc/nginx/conf.d/son-durak.conf":sys.argv[2]}
for target,source in expected.items():
    assert any(v["target"]==target and os.path.realpath(v.get("source",""))==os.path.realpath(source) and v.get("read_only") for v in volumes), f"Eksik veya hatalı mount: {target}"
' "$config_dir" "$loader"
if [[ "$phase" == bootstrap && -f "$config" ]] && grep -q 'listen 443 ssl' "$config"; then
  echo 'HTTPS zaten kurulmuş; bootstrap ile geri alınmadı.'; exit 0
fi
if [[ "$phase" == https ]]; then
  docker exec "$EDGE_CONTAINER" test -r "/etc/letsencrypt/live/$QUIZ_DOMAIN/fullchain.pem"
  docker exec "$EDGE_CONTAINER" test -r "/etc/letsencrypt/live/$QUIZ_DOMAIN/privkey.pem"
fi
candidate="$(mktemp "$config_dir/.candidate.XXXXXX")"
previous="$(mktemp "$config_dir/.previous.XXXXXX")"
had_previous=false
[[ ! -f "$config" ]] || { cp "$config" "$previous"; had_previous=true; }
restore() {
  if [[ "$had_previous" == true ]]; then cp "$previous" "$config"; else rm -f "$config"; fi
  rm -f "$candidate" "$previous"
}
trap restore ERR
python3 "$DEPLOY_DIR/scripts/render-nginx.py" "$phase" "$QUIZ_DOMAIN" > "$candidate"
chmod 644 "$candidate"
mv "$candidate" "$config"
# Validate in a one-off container: no ports published and no sibling restarts.
edge_compose run --rm --no-deps --entrypoint nginx nginx -t
if docker inspect "$EDGE_CONTAINER" --format '{{json .Mounts}}' | python3 -c '
import json,os,sys
mounts=json.load(sys.stdin)
assert all(any(m["Destination"]==target and os.path.realpath(m["Source"])==os.path.realpath(source) for m in mounts) for target,source in [("/etc/nginx/son-durak",sys.argv[1]),("/etc/nginx/conf.d/son-durak.conf",sys.argv[2])])
' "$config_dir" "$loader" 2>/dev/null; then
  docker exec "$EDGE_CONTAINER" nginx -t
  docker exec "$EDGE_CONTAINER" nginx -s reload
else
  # Only this first mount installation recreates the shared edge nginx.
  edge_compose up -d --no-deps --force-recreate nginx
  docker exec "$EDGE_CONTAINER" nginx -t
fi
trap - ERR
rm -f "$previous"
echo "Edge nginx: $phase yapılandırması hazır ($QUIZ_DOMAIN)."
