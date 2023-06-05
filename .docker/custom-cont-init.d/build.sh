#!/bin/bash

trap times EXIT; rm -f /app/.env; touch /app/.env

if [[ -z ${JWT_SECRET} ]]; then
  echo "
    ************************************************
    WARNING
    JWT_SECRET is automatic created but not
    persist when container is recreated, set to fix.
    ************************************************
  "
fi

JWT_SECRET="${JWT_SECRET:-$(pwgen 32 1)}"

if [[ -z ${SESSION_SECRET} ]]; then
  echo "
    ************************************************
    WARNING
    SESSION_SECRET is automatic created but not
    persist when container is recreated, set to fix.
    ************************************************
  "
fi

SESSION_SECRET="${SESSION_SECRET:-$(pwgen 32 1)}"

echo "
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
" >> /app/.env

DOMAIN="${DOMAIN:-localhost}"
SCHEMA="${SCHEMA:-http}"
HOST="${SCHEMA}://${DOMAIN}"

MODE="${MODE:-single}"

if [[ "${MODE}" = "nouser" ]]; then
  ENABLE_SMTP="${ENABLE_SMTP:-false}"
  ZEN_MODE="${ZEN_MODE:-true}"
fi

if [[ "${MODE}" = "team" ]]; then
  ENABLE_ADMIN="${ENABLE_ADMIN:-true}"
fi

ENABLE_ADMIN="${ENABLE_ADMIN:-false}"
ENABLE_API="${ENABLE_API:-true}"
ENABLE_SMTP="${ENABLE_SMTP:-true}"

echo "
# More information:
# https://docs.hoppscotch.io/documentation/self-host/install-and-build#configuring-the-environment
#
# New ENV are added to start applied customizations:
# https://docs.hoppscotch.io/documentation/features/customization

# default: true
PRODUCTION=${PRODUCTION:-true}

# default: single
# values: single, nouser, team
MODE=${MODE}

# default: false
ENABLE_ADMIN=${ENABLE_ADMIN}

# default: true
ENABLE_API=${ENABLE_API}

# default: true
ENABLE_SMTP=${ENABLE_SMTP}

# default (seconds): 60
RATE_LIMIT_TTL=${RATE_LIMIT_TTL:-60}

# default (by ip): 100
RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}

# default: 10
TOKEN_SALT_COMPLEXITY=${TOKEN_SALT_COMPLEXITY:-10}

# default: 3
MAGIC_LINK_TOKEN_VALIDITY=${MAGIC_LINK_TOKEN_VALIDITY:-3}

# default (7 days in ms): 604800000
REFRESH_TOKEN_VALIDITY=${REFRESH_TOKEN_VALIDITY:-604800000}

# default (1 day in ms): 86400000
ACCESS_TOKEN_VALIDITY=${ACCESS_TOKEN_VALIDITY:-86400000}
" | tee -a /app/.env

echo "JWT_SECRET=${JWT_SECRET}" >> /app/.env
echo "SESSION_SECRET=${SESSION_SECRET}" >> /app/.env
echo "
JWT_SECRET=*****
SESSION_SECRET=*****
"

if [[ "${SCHEMA}" = "http" ]]; then
  echo "
    *****************************************************
    INFORMATION
    Keep in mind to work in SCHEMA HTTP is necessary
    disable 2 security features: httpOnly and secure
    - If you is using a reverse proxy you good to go
    - Don't use this option direct exposed in production!
    *****************************************************
  "
  sleep 1

  sed -i "s|httpOnly: true|httpOnly: false|g" \
    /app/packages/hoppscotch-backend/src/auth/helper.ts

  sed -i "s|secure: true|secure: false|g" \
    /app/packages/hoppscotch-backend/src/auth/helper.ts
fi

PROXY_HOST="${PROXY_HOST:-https://proxy.hoppscotch.io/}"
sed -i "s|https://proxy.hoppscotch.io/|${PROXY_HOST}|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

PROXY_ENABLED="${PROXY_ENABLED:-false}"
sed -i "s|PROXY_ENABLED: false|PROXY_ENABLED: ${PROXY_ENABLED}|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

EXTENSIONS_ENABLED="${EXTENSIONS_ENABLED:-false}"
sed -i "s|EXTENSIONS_ENABLED: false|EXTENSIONS_ENABLED: ${EXTENSIONS_ENABLED}|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

TELEMETRY_ENABLED="${TELEMETRY_ENABLED:-true}"
sed -i "s|TELEMETRY_ENABLED: true|TELEMETRY_ENABLED: ${TELEMETRY_ENABLED}|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

THEME_COLOR="${THEME_COLOR:-indigo}"
sed -i "s|THEME_COLOR: \"indigo\"|THEME_COLOR: \"${THEME_COLOR}\"|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

BG_COLOR="${BG_COLOR:-system}"
sed -i "s|BG_COLOR: \"system\"|BG_COLOR: \"${BG_COLOR}\"|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

FONT_SIZE="${FONT_SIZE:-small}"
sed -i "s|FONT_SIZE: \"small\"|FONT_SIZE: \"${FONT_SIZE}\"|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

ZEN_MODE="${ZEN_MODE:-false}"
sed -i "s|ZEN_MODE: false|ZEN_MODE: ${ZEN_MODE}|g" \
  /app/packages/hoppscotch-common/src/newstore/settings.ts

VITE_ADMIN_BASE_URL="${VITE_ADMIN_BASE_URL:-/admin}"
VITE_ADMIN_BASE_URL="$(echo "${VITE_ADMIN_BASE_URL}" | sed 's/\/$//')"
sed -i "s|VITE_ADMIN_BASE_URL|${VITE_ADMIN_BASE_URL}|g" /Caddyfile

echo "
# default: http
# values: http, https
SCHEMA=${SCHEMA}

DOMAIN=${DOMAIN}
HOST=${HOST}

# default: https://proxy.hoppscotch.io
PROXY_HOST=${PROXY_HOST:-https://proxy.hoppscotch.io}

# default: false
PROXY_ENABLED=${PROXY_ENABLED:-false}

# default: false
EXTENSIONS_ENABLED=${EXTENSIONS_ENABLED}

# default: true
TELEMETRY_ENABLED=${TELEMETRY_ENABLED}

# default: indigo
# values: green, teal, blue, indigo, purple, yellow, orange, red, pink
THEME_COLOR=${THEME_COLOR}

# default: system
# values: system, light, dark, black
BG_COLOR=${BG_COLOR}

# default: small
# values: small, medium, large
FONT_SIZE=${FONT_SIZE}

# default: false
ZEN_MODE=${ZEN_MODE}

# default: HOST
REDIRECT_URL=${REDIRECT_URL:-${HOST}}

# default: HOST
WHITELISTED_ORIGINS=${WHITELISTED_ORIGINS:-${HOST}}

# default: HOST
VITE_BASE_URL=${VITE_BASE_URL:-${HOST}}

# default: HOST
VITE_SHORTCODE_BASE_URL=${VITE_SHORTCODE_BASE_URL:-${HOST}}

# default: HOST/api/v1
VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL:-${HOST}/api/v1}

# default: HOST/api/graphql
VITE_BACKEND_GQL_URL=${VITE_BACKEND_GQL_URL:-${HOST}/api/graphql}

# default: wss://DOMAIN/api/graphql
VITE_BACKEND_WS_URL=${VITE_BACKEND_WS_URL:-wss://${DOMAIN}/api/graphql}

# default: /admin
VITE_ADMIN_BASE_URL=${VITE_ADMIN_BASE_URL}

# default: HOST+VITE_ADMIN_BASE_URL
VITE_ADMIN_URL=${VITE_ADMIN_URL:-${HOST}${VITE_ADMIN_BASE_URL}}

# default: https://docs.hoppscotch.io/support/terms
VITE_APP_TOS_LINK=${VITE_APP_TOS_LINK:-https://docs.hoppscotch.io/support/terms}

# default: https://docs.hoppscotch.io/support/privacy
VITE_APP_PRIVACY_POLICY_LINK=${VITE_APP_PRIVACY_POLICY_LINK:-https://docs.hoppscotch.io/support/privacy}

# default: empty
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-empty}

# default: empty
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-empty}

# default: HOST/v1/auth/google/callback
GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL:-${HOST}/v1/auth/google/callback}

# default: email,profile
GOOGLE_SCOPE=${GOOGLE_SCOPE:-email,profile}

# default: empty
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-empty}

# default: empty
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-empty}

# default: HOST/v1/auth/github/callback
GITHUB_CALLBACK_URL=${GITHUB_CALLBACK_URL:-${HOST}/v1/auth/github/callback}

# default: user:email
GITHUB_SCOPE=${GITHUB_SCOPE:-user:email}

# default: empty
MICROSOFT_CLIENT_ID=${MICROSOFT_CLIENT_ID:-empty}

# default: empty
MICROSOFT_CLIENT_SECRET=${MICROSOFT_CLIENT_SECRET:-empty}

# default: HOST/v1/auth/microsoft/callback
MICROSOFT_CALLBACK_URL=${MICROSOFT_CALLBACK_URL:-${HOST}/v1/auth/microsoft/callback}

# default: user.read
MICROSOFT_SCOPE=${MICROSOFT_SCOPE:-user.read}
" | tee -a /app/.env

# SMTP

if [[ -z ${MAILER_SMTP_URL} ]]; then
  SMTP_PROTOCOL="${SMTP_PROTOCOL:-smtp}"
  SMTP_DOMAIN="${SMTP_DOMAIN:-localhost}"
  SMTP_PORT="${SMTP_PORT:-25}"
  SMTP_USER="${SMTP_USER:-nouser}"
  SMTP_PASSWORD="${SMTP_PASSWORD:-nopass}"

  echo "## SMTP

# default: smtp
SMTP_PROTOCOL=${SMTP_PROTOCOL}

# default: localhost
SMTP_DOMAIN=${SMTP_DOMAIN}

# default: 25
SMTP_PORT=${SMTP_PORT}

# default: nouser
SMTP_USER=${SMTP_USER}

# default: nopass
SMTP_PASSWORD=*****"

  if [[ -z ${MAILER_ADDRESS_FROM} ]]; then
      MAILER_ADDRESS_FROM="'${SMTP_USER} <${SMTP_USER}@${SMTP_DOMAIN}>'"
      echo "
# default: 'SMTP_USER <SMTP_USER@SMTP_DOMAIN>'"
      echo "MAILER_ADDRESS_FROM=${MAILER_ADDRESS_FROM}" | tee -a /app/.env
  fi

  SMTP_URI="${SMTP_DOMAIN}:${SMTP_PORT}"
  SMTP_URL=''
  if [[ "${SMTP_USER}" != 'nouser' ]]; then
    SMTP_URL="${SMTP_USER}@${DOMAIN}:${SMTP_PASSWORD}@"
  fi

  MAILER_SMTP_URL="${SMTP_PROTOCOL}://${SMTP_URL}${SMTP_URI}"
  echo "
# default: 'SMTP_PROTOCOL://SMTP_USER@DOMAIN:SMTP_PASSWORD@SMTP_DOMAIN:SMTP_PORT'
# SMTP_USER=nouser: 'SMTP_PROTOCOL://SMTP_DOMAIN:SMTP_PORT'"
  echo "MAILER_SMTP_URL=${MAILER_SMTP_URL}" | sed "s|${SMTP_PASSWORD}|*****|"
else
  echo "MAILER_SMTP_URL=*****"
fi

echo "MAILER_SMTP_URL=${MAILER_SMTP_URL}" >> /app/.env

# DATABASE

echo "" | tee -a /app/.env

if [[ -z ${DATABASE_URL} ]]; then
  POSTGRES_HOST="${POSTGRES_HOST:-hoppscotch-db}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  POSTGRES_DB="${POSTGRES_DB:-hoppscotch}"
  POSTGRES_USER="${POSTGRES_USER:-postgres}"

  echo "## DATABASE

# default: hoppscotch-db
POSTGRES_HOST=${POSTGRES_HOST}

# default: 5432
POSTGRES_PORT=${POSTGRES_PORT}

# default: hoppscotch
POSTGRES_DB=${POSTGRES_DB}

# default: postgres
POSTGRES_USER=${POSTGRES_USER}

# default: NOT SET
POSTGRES_PASSWORD=*****"

  if [[ -n ${POSTGRES_PASSWORD} ]]; then
    DATABASE_URI="${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
    DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DATABASE_URI}"
    echo "# default: 'postgres://POSTGRES_USER:POSTGRES_PASSWORD@POSTGRES_HOST:POSTGRES_PORT/POSTGRES_DB'"
    echo "DATABASE_URL=${DATABASE_URL}" | sed "s|${POSTGRES_PASSWORD}|*****|"
    echo "DATABASE_URL=${DATABASE_URL}" >> /app/.env
  fi
fi

function uris() {
  echo "
--------------------------------------------------
--------------------------------------------------
"
  echo "APP: ${HOST}"

  if [[ "${ENABLE_ADMIN}" = "true" ]]; then
    echo "ADMIN: ${VITE_ADMIN_URL}"
  fi

  if [[ "${ENABLE_API}" = "true" ]] && [[ -n ${DATABASE_URL} ]]; then
    echo "API:
    ${VITE_BACKEND_API_URL}
    ${VITE_BACKEND_GQL_URL}
    ${VITE_BACKEND_WS_URL}"
  fi
  echo "
--------------------------------------------------
--------------------------------------------------
"
}

# shellcheck source=/dev/null
source /app/.env

if cmp --silent -- "/app/.env" "/app/.build"; then
  echo "
  ***********************************************
  INFORMATION: Skipping build, no changes in ENV
  ***********************************************
  "
  uris
  exit 0
fi

# backup copy for users config
cp -f /app/.env /config/.env

# to make sure you have build in this container already
cp -f /app/.env /app/.build

echo "
───────────────────────────────────────
BUILD APP
───────────────────────────────────────
"

cd /app/packages/hoppscotch-selfhost-web || exit
pnpm run --silent build > /dev/null
echo 'done.'

echo "
───────────────────────────────────────
BUILD ADMIN
───────────────────────────────────────
"

if [[ "${ENABLE_ADMIN}" = "true" ]]; then
  # build admin
  cd /app/packages/hoppscotch-sh-admin || exit

  sed -i "s|fullPath === '/'|fullPath === '${VITE_ADMIN_BASE_URL}'|g" \
    /app/packages/hoppscotch-sh-admin/src/modules/router.ts

  sed -i "s|createWebHistory()|createWebHistory('${VITE_ADMIN_BASE_URL}')|g" \
    /app/packages/hoppscotch-sh-admin/src/modules/router.ts

  pnpm run --silent build --base="${VITE_ADMIN_BASE_URL}/" > /dev/null
else
  rm -rf /app/packages/hoppscotch-sh-admin/dist
  echo "
  **************************************************
  INFORMATION: Skipping ADMIN, ENABLE_ADMIN is false
  **************************************************

"
fi

echo 'done.'

echo "
───────────────────────────────────────
BUILD API
───────────────────────────────────────
"

if [[ "${ENABLE_API}" = 'true' ]]; then
  if [[ -z ${DATABASE_URL} ]] && [[ -z ${POSTGRES_PASSWORD} ]]; then
      echo "
    ****************************************************
    INFORMATION: Skipping API, POSTGRES_PASSWORD not set
    ****************************************************

    "
  else
    # build api
    cd /app/packages/hoppscotch-backend || exit
    mv /app/.env .env
    cp /app/pnpm-lock.yaml pnpm-lock.yaml

    pnpm fetch > /dev/null
    pnpm install --offline --filter hoppscotch-backend > /dev/null
    pnpm exec prisma generate > /dev/null
    pnpm exec prisma migrate deploy
  fi
else
  echo "
  **********************************************
  INFORMATION: Skipping API, ENABLE_API is false
  **********************************************

"
fi

echo 'done.'
uris
