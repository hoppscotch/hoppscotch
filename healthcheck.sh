curlCheck() {
  if ! curl -s --max-time 4 --head "$1" | head -n 1 | grep -q "HTTP/1.[01] [23].."; then
    echo "URL request failed!"
    return 1
  else
    echo "URL request succeeded!"
    return 0
  fi
}

# Startup is covered by the HEALTHCHECK start period: failures during it don't
# count towards the retries.

if [ "$ENABLE_SUBPATH_BASED_ACCESS" = "true" ]; then
  curlCheck "http://localhost:${HOPP_ALTERNATE_PORT:-${HOPP_AIO_ALTERNATE_PORT:-80}}/backend/ping" || exit 1
else
  curlCheck "http://localhost:3000" || exit 1
  curlCheck "http://localhost:3100" || exit 1
  curlCheck "http://localhost:3170/ping" || exit 1
fi
