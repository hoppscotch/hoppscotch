#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"
./scripts/local-dev/start-db.sh
./scripts/local-dev/migrate-db.sh
