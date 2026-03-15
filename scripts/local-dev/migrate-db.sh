#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"
./scripts/local-dev/ensure-env.sh >/dev/null
set -a
source ./.env.localtest
set +a
exec pnpm --filter hoppscotch-backend exec prisma migrate deploy
