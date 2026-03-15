#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"
./scripts/local-dev/ensure-env.sh >/dev/null
docker compose up -d hoppscotch-db

STATUS=""
CONTAINER_ID=""
for _ in {1..60}; do
  CONTAINER_ID="$(docker compose ps -q hoppscotch-db)"

  if [[ -n "${CONTAINER_ID}" ]]; then
    STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${CONTAINER_ID}" 2>/dev/null || true)"
  fi

  if [[ "${STATUS}" == "healthy" ]]; then
    docker compose ps hoppscotch-db
    exit 0
  fi

  sleep 1
done

echo "hoppscotch-db failed to become healthy (last status: ${STATUS:-unknown})" >&2
docker compose ps hoppscotch-db || true
exit 1
