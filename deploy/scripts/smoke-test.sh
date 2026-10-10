#!/usr/bin/env bash
# Isolated local/CI checks. Never connects to the production edge or volumes.
set -euo pipefail
image="${1:?Kullanım: smoke-test.sh web-image:tag [domain]}"
domain="${2:-iettquiz.duckdns.org}"
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
temporary="$(mktemp -d)"
network="son-durak-smoke-$$"
edge="${network}-edge"
web="${network}-web"
api="${network}-api"
cleanup() {
  docker rm -f "$edge" "$web" "$api" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$temporary"
}
trap cleanup EXIT
mkdir -p "$temporary/config" "$temporary/cert" "$temporary/acme/.well-known/acme-challenge"
printf 'challenge-ok' > "$temporary/acme/.well-known/acme-challenge/probe"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$domain" \
  -addext "subjectAltName=DNS:$domain" -keyout "$temporary/cert/privkey.pem" -out "$temporary/cert/fullchain.pem" >/dev/null 2>&1
cat > "$temporary/club.conf" <<'NGINX'
server { listen 80; server_name existing-club.test; location / { return 200 'club-is-running'; } }
NGINX
cat > "$temporary/api.conf" <<'NGINX'
server { listen 3001; location / { default_type application/json; return 200 '{"uri":"$request_uri","proto":"$http_x_forwarded_proto"}'; } }
NGINX
python3 "$root/deploy/scripts/render-nginx.py" bootstrap "$domain" > "$temporary/config/site.conf"
docker network create "$network" >/dev/null
docker run -d --name "$web" --network "$network" --network-alias son-durak-web "$image" >/dev/null
docker run -d --name "$api" --network "$network" --network-alias son-durak-api \
  -v "$temporary/api.conf:/etc/nginx/conf.d/default.conf:ro" nginx:stable-alpine >/dev/null
docker run -d --name "$edge" --network "$network" -p 127.0.0.1::80 -p 127.0.0.1::443 \
  -v "$temporary/club.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$root/deploy/nginx/edge-loader.conf:/etc/nginx/conf.d/son-durak.conf:ro" \
  -v "$temporary/config:/etc/nginx/son-durak:ro" \
  -v "$temporary/cert:/etc/letsencrypt/live/$domain:ro" \
  -v "$temporary/acme:/var/www/certbot:ro" nginx:stable-alpine >/dev/null
http_port="$(docker port "$edge" 80/tcp | cut -d: -f2)"
https_port="$(docker port "$edge" 443/tcp | cut -d: -f2)"
curl_common=(--silent --show-error --fail --retry 12 --retry-all-errors --retry-delay 1 --max-time 10)
[[ "$(curl "${curl_common[@]}" -H 'Host: existing-club.test' "http://127.0.0.1:$http_port/")" == club-is-running ]]
[[ "$(curl "${curl_common[@]}" -H "Host: $domain" "http://127.0.0.1:$http_port/.well-known/acme-challenge/probe")" == challenge-ok ]]
# Promote just the extra virtual host to HTTPS; the existing site stays intact.
python3 "$root/deploy/scripts/render-nginx.py" https "$domain" > "$temporary/config/site.conf.new"
mv "$temporary/config/site.conf.new" "$temporary/config/site.conf"
docker exec "$edge" nginx -t
docker exec "$edge" nginx -s reload
base="https://$domain:$https_port"
tls=(--cacert "$temporary/cert/fullchain.pem" --resolve "$domain:$https_port:127.0.0.1")
curl "${curl_common[@]}" "${tls[@]}" "$base/healthz" >/dev/null
curl "${curl_common[@]}" "${tls[@]}" "$base/" > "$temporary/index.html"
grep -Fq "https://$domain/" "$temporary/index.html"
curl "${curl_common[@]}" "${tls[@]}" "$base/nasil-oynanir/" >/dev/null
curl "${curl_common[@]}" "${tls[@]}" "$base/precache-assets.json" > "$temporary/assets.json"
python3 -c 'import json,sys; assets=json.load(open(sys.argv[1])); assert any("LocalApp" in p and p.endswith(".js") for p in assets)' "$temporary/assets.json"
[[ "$(curl -sS "${tls[@]}" -o /dev/null -w '%{http_code}' "$base/does-not-exist")" == 404 ]]
curl "${curl_common[@]}" "${tls[@]}" "$base/api/v1/probe?foo=bar" > "$temporary/probe.json"
python3 -c 'import json,sys; assert json.load(open(sys.argv[1])) == {"uri":"/v1/probe?foo=bar","proto":"https"}' "$temporary/probe.json"
[[ "$(curl "${curl_common[@]}" -H 'Host: existing-club.test' "http://127.0.0.1:$http_port/")" == club-is-running ]]
curl --silent --show-error -D "$temporary/headers" -o /dev/null -H "Host: $domain" "http://127.0.0.1:$http_port/?duel=abc"
grep -Fq "Location: https://$domain/?duel=abc" "$temporary/headers"
echo 'OK: existing site, ACME, HTTPS, frontend, static pages, 404, lazy assets, API path/query and forwarded HTTPS.'
