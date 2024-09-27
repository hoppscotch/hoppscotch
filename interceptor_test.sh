#!/usr/bin/env bash

BASE_URL="http://localhost:9119"

handle_error() {
    echo "Error: $1"
    exit 1
}

echo "1: Handshake"
handshake_response=$(curl -s -X GET "${BASE_URL}/handshake")
echo "$handshake_response"
echo

if ! echo "$handshake_response" | jq -e '.status == "success"' > /dev/null; then
    handle_error "Handshake failed"
fi

echo "2: Receive Registration"
registration_code="REG_$(date +%s)"
receive_reg_response=$(curl -s -X POST "${BASE_URL}/receive-registration" \
    -H "Content-Type: application/json" \
    -d "{\"registration\": \"$registration_code\"}")
echo "$receive_reg_response"
echo

if ! echo "$receive_reg_response" | jq -e '.message == "Registration received and stored"' > /dev/null; then
    handle_error "Registration failed"
fi

echo "3: Verify Registration"
verify_reg_response=$(curl -s -X POST "${BASE_URL}/verify-registration" \
    -H "Content-Type: application/json" \
    -d "{\"registration\": \"$registration_code\"}")
echo "$verify_reg_response"
echo

auth_key=$(echo "$verify_reg_response" | jq -r '.auth_key')
if [ -z "$auth_key" ]; then
    handle_error "Failed to obtain auth key"
fi

echo "4: Send Request"
request_response=$(curl -s -X POST "${BASE_URL}/request" \
    -H "Content-Type: application/json" \
    -H "Authorization: $auth_key" \
    -d '{
    "req_id": 1,
    "method": "GET",
    "endpoint": "https://httpbin.org/headers",
    "headers": [
        {"key": "User-Agent", "value": "Hoppscotch/2024.9.0"},
        {"key": "Accept", "value": "application/json"},
        {"key": "Origin", "value": "https://hoppscotch.io"},
        {"key": "Host", "value": "httpbin.org"},
        {"key": "Referer", "value": "https://hoppscotch.io/"},
        {"key": "Sec-Fetch-Mode", "value": "cors"},
        {"key": "X-Custom-Header", "value": "test_custom_header"}
    ],
    "body": null,
    "validate_certs": true,
    "root_cert_bundle_files": [],
    "client_cert": null
}')

echo "Response from httpbin.org:"
echo "$request_response"

echo "Full flow test completed successfully!"
