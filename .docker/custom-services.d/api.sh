#!/usr/bin/with-contenv bash
# shellcheck source=/dev/null
source /app/.build

# protection against fatal error
sleep 2

echo "
───────────────────────────────────────
STARTING API
───────────────────────────────────────
"

if [[ "${ENABLE_API}" = "false" ]]; then
  echo "
  ****************************************************
  INFORMATION: Skipping API start, ENABLE_API is false
  ****************************************************
  "
  sleep 365d
  exit 0
fi

if [[ -z ${DATABASE_URL} ]] && [[ -z ${POSTGRES_PASSWORD} ]]; then
    echo "
  **********************************************************
  INFORMATION: Skipping API start, POSTGRES_PASSWORD not set
  **********************************************************
  "
  sleep 365d
  exit 0
fi

cd /app/packages/hoppscotch-backend/ || exit
pnpm run start:prod
