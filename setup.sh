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

# Prints a secret of exactly $1 characters, or fails.
# `tr -d` drops the base64 characters that would need escaping inside a connection URL.
# A pipeline would hide an openssl failure (its exit status is the last command's, i.e. `cut`),
# so capture openssl separately and check the resulting length.
random_secret() {
  raw=$(openssl rand -base64 48) || return 1
  secret=$(printf '%s' "$raw" | tr -d '\n=+/' | cut -c "1-$1")
  [ "${#secret}" -eq "$1" ] || return 1
  printf '%s' "$secret"
}

if ! POSTGRES_PASSWORD=$(random_secret 32); then
  echo "error: openssl failed to generate a password" >&2
  exit 1
fi

# AES-256 requires the key to be exactly 32 bytes.
if ! DATA_ENCRYPTION_KEY=$(random_secret 32); then
  echo "error: openssl failed to generate an encryption key" >&2
  exit 1
fi

# Rendered with shell built-ins rather than `sed "s|...|$secret|"`, so that the generated
# secrets never appear in a child process's arguments where `ps` would expose them.
umask 077
while IFS= read -r line || [ -n "$line" ]; do
  case $line in
    DATABASE_URL=*)
      printf 'DATABASE_URL=postgresql://postgres:%s@hoppscotch-db:5432/hoppscotch?connect_timeout=300\n' "$POSTGRES_PASSWORD"
      ;;
    POSTGRES_PASSWORD=*)
      printf 'POSTGRES_PASSWORD=%s\n' "$POSTGRES_PASSWORD"
      ;;
    DATA_ENCRYPTION_KEY=*)
      printf 'DATA_ENCRYPTION_KEY=%s\n' "$DATA_ENCRYPTION_KEY"
      ;;
    *)
      printf '%s\n' "$line"
      ;;
  esac
done < "$ENV_EXAMPLE" > "$ENV_FILE"

echo "Created $ENV_FILE with a generated POSTGRES_PASSWORD and DATA_ENCRYPTION_KEY."
echo "Back it up: losing DATA_ENCRYPTION_KEY makes existing encrypted config unrecoverable."
echo "Next: docker compose --profile default up"
