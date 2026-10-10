#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
# The currently running API may belong to a previous server-mode deployment.
compose_profile=(--profile server)
container_id="$(compose ps -q api)"
[[ -n "$container_id" ]] || { echo 'Yedeklenecek çalışan API yok.' >&2; exit 1; }
if [[ "${DEPLOY_BACKUP:-}" != 1 ]]; then
  exec 9>"$DEPLOY_DIR/.deploy.lock"
  flock -n 9 || { echo 'Deploy/yedekleme işlemi devam ediyor.' >&2; exit 1; }
fi
backup_dir="$DEPLOY_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$backup_dir"
chmod 700 "$DEPLOY_DIR/backups" "$backup_dir"
# SQLite must have no writers while the database and WAL/SHM are copied.
compose stop api
trap 'compose start api' EXIT
docker cp "$container_id:/app/data/." "$backup_dir/"
chmod -R go-rwx "$backup_dir"
echo "SQLite yedeği: $backup_dir"
