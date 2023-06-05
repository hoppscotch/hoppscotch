#!/usr/bin/with-contenv bash
# shellcheck source=/dev/null
source /app/.build

# protection against fatal error
sleep 1

echo "
───────────────────────────────────────
STARTING SMTP
───────────────────────────────────────
"

if [[ "${ENABLE_SMTP}" = "false" ]]; then
  echo "
  ******************************************************
  INFORMATION: Skipping SMTP start, ENABLE_SMTP is false
  ******************************************************
  "
  sleep 365d
  exit 0
fi

MESSAGE="Use the link to login: ${HOST}/enter?token="

python3 -m smtpd -n -c DebuggingServer localhost:25 |& \
  stdbuf -oL sed -n "s|3D||p" | \
  stdbuf -oL sed -n "s|^.*token=\([a-zA-Z0-9]*\).*$|${MESSAGE}\1|p"
