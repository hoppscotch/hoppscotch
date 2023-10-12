#!/bin/bash

curlCheck() {
  if ! curl -s --head "$1" | head -n 1 | grep -q "HTTP/1.[01] [23].."; then
    echo "URL request failed!"
    exit 1
  else
    echo "URL request succeeded!"
  fi
}

curlCheck "http://localhost:3000"
curlCheck "http://localhost:3100"
curlCheck "http://localhost:3170/ping"
