#!/usr/bin/env bash
# Starts the assembled selfhost-web app (same renderer as the desktop app) for the
# full-app memory harness. Dev-mode vite does NOT need .env (import-meta-env is only
# wired when HOPP_ALLOW_RUNTIME_ENV is set), so the required VITE_ vars are passed
# inline. Backends are pointed at localhost; with no backend running the app boots
# into the offline/personal workspace (backend calls fail gracefully).
#
# Prereq (one-time, normally done by a full `pnpm install`): the workspace libs
# @hoppscotch/{data,kernel,js-sandbox} and codemirror-lang-graphql must be built,
# and the gql-codegen artifacts present (a normal install generates them).
set -euo pipefail
cd "$(dirname "$0")/../../../hoppscotch-selfhost-web"

VITE_BASE_URL=http://localhost:3000 \
VITE_SHORTCODE_BASE_URL=http://localhost:3000 \
VITE_BACKEND_API_URL=http://localhost:3170/v1 \
VITE_BACKEND_GQL_URL=http://localhost:3170/graphql \
VITE_BACKEND_WS_URL=ws://localhost:3170/graphql \
VITE_APP_TOS_LINK=http://localhost:3000/tos \
VITE_APP_PRIVACY_POLICY_LINK=http://localhost:3000/privacy \
VITE_PROXYSCOTCH_ACCESS_TOKEN=dummy \
exec pnpm exec vite --port "${PORT:-3000}" --strictPort
