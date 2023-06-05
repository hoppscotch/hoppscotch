#!/usr/bin/with-contenv bash

# protection against fatal error
sleep 3
echo "
───────────────────────────────────────
STARTING APP
───────────────────────────────────────
"

HOME='/app'
caddy fmt --overwrite /Caddyfile
caddy run --config /Caddyfile
