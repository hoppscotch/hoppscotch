#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.localtest"

if [[ -f "${ENV_FILE}" ]]; then
  exit 0
fi

SOURCE_ENV="${ROOT_DIR}/.env"
if [[ ! -f "${SOURCE_ENV}" ]]; then
  SOURCE_ENV="${ROOT_DIR}/.env.example"
fi

cp "${SOURCE_ENV}" "${ENV_FILE}"

python3 - <<'PY' "${ENV_FILE}"
from pathlib import Path
import sys

path = Path(sys.argv[1])
lines = path.read_text().splitlines()
updates = {
    "DATABASE_URL": "postgresql://postgres:testpass@localhost:5432/hoppscotch",
    "VITE_BACKEND_GQL_URL": "http://localhost:3170/graphql",
    "VITE_BACKEND_WS_URL": "ws://localhost:3170/graphql",
    "VITE_BACKEND_API_URL": "http://localhost:3170/v1",
}

out = []
seen = set()
for line in lines:
    replaced = False
    for key, value in updates.items():
        if line.startswith(f"{key}="):
            out.append(f"{key}={value}")
            seen.add(key)
            replaced = True
            break
    if not replaced:
        out.append(line)

for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")

path.write_text("\n".join(out) + "\n")
PY

echo "Created ${ENV_FILE}"
echo "Local backend targets:"
echo "  DATABASE_URL=postgresql://postgres:testpass@localhost:5432/hoppscotch"
echo "  VITE_BACKEND_GQL_URL=http://localhost:3170/graphql"
echo "  VITE_BACKEND_WS_URL=ws://localhost:3170/graphql"
echo "  VITE_BACKEND_API_URL=http://localhost:3170/v1"
