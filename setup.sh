#!/usr/bin/env sh
# Generates a .env for a self-hosted Hoppscotch deployment with secrets that are unique
# to this deployment. Run this once, before the first `docker compose up`.
#
# Secrets generated here:
#   POSTGRES_PASSWORD   - password for the preset Postgres container
#   DATA_ENCRYPTION_KEY - 32 char key used to encrypt secrets (JWT_SECRET, SMTP/OAuth creds, ...)
#                         at rest in the InfraConfig table
#
# WARNING: DATA_ENCRYPTION_KEY cannot be changed after the first boot without making every
# already-encrypted row unreadable. Back up the generated .env.

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

if [ -f "$ENV_FILE" ]; then
  echo ".env already exists at $ENV_FILE, leaving it untouched."
  echo "If it still contains the example values (testpass / 'data encryption key with 32 char'),"
  echo "rotate them manually before exposing this deployment."
  exit 0
fi

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "error: $ENV_EXAMPLE not found" >&2
  exit 1
fi

if ! command -v openssl > /dev/null 2>&1; then
  echo "error: openssl is required to generate secrets" >&2
  exit 1
fi

# `tr -d` drops the base64 characters that would need escaping inside a connection URL.
random_secret() {
  openssl rand -base64 48 | tr -d '\n=+/' | cut -c "1-$1"
}

POSTGRES_PASSWORD=$(random_secret 32)
# AES-256 requires the key to be exactly 32 bytes.
DATA_ENCRYPTION_KEY=$(random_secret 32)

umask 077
sed \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@hoppscotch-db:5432/hoppscotch|" \
  -e "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=${DATA_ENCRYPTION_KEY}|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
  "$ENV_EXAMPLE" > "$ENV_FILE"

echo "Created $ENV_FILE with a generated POSTGRES_PASSWORD and DATA_ENCRYPTION_KEY."
echo "Back it up: losing DATA_ENCRYPTION_KEY makes existing encrypted config unrecoverable."
echo "Next: docker compose --profile default up"
