#!/usr/bin/env bash
# Usage: MAILCOW_API_KEY=<key> MAILCOW_API_HOST=https://mail-engine.domain.com \
#          ./scripts/add-mailbox.sh <email> <password> [name] [quota-mb]
# Example: ./scripts/add-mailbox.sh sign@acme.com 's3cret-long-pass' "Sign" 1024
#
# Creates a mailbox through Mailcow's REST API (POST /api/v1/add/mailbox, see
# FLOW.md). The domain must already exist in Mailcow.
#
# MAILCOW_API_HOST defaults to https://localhost. When Mailcow sits behind a
# host nginx (deploy-vps.sh proxy mode) use the public https://<mail-hostname>.
set -euo pipefail

if [[ $# -lt 2 || $# -gt 4 ]]; then
  echo "Usage: $0 <email> <password> [name] [quota-mb]" >&2
  exit 1
fi

EMAIL="$1"
PASSWORD="$2"
NAME="${3:-${EMAIL%@*}}"
QUOTA="${4:-3072}"
MAILCOW_API_HOST="${MAILCOW_API_HOST:-https://localhost}"
MAILCOW_API_KEY="${MAILCOW_API_KEY:-}"

if [[ -z "${MAILCOW_API_KEY}" ]]; then
  echo "MAILCOW_API_KEY is not set" >&2
  exit 1
fi
if [[ "${EMAIL}" != *@*.* ]]; then
  echo "Invalid email: ${EMAIL}" >&2
  exit 1
fi
if [[ ${#PASSWORD} -lt 12 ]]; then
  echo "Password must be at least 12 characters" >&2
  exit 1
fi
command -v jq >/dev/null || { echo "jq is required (apt install jq)" >&2; exit 1; }

LOCAL_PART="${EMAIL%@*}"
DOMAIN="${EMAIL#*@}"

# jq builds the JSON so quotes/backslashes in the password cannot break it.
payload=$(jq -n \
  --arg lp "${LOCAL_PART}" --arg dom "${DOMAIN}" --arg name "${NAME}" \
  --arg quota "${QUOTA}" --arg pw "${PASSWORD}" \
  '{local_part:$lp, domain:$dom, name:$name, quota:$quota,
    password:$pw, password2:$pw, active:"1", force_pw_update:"0"}')

response=$(curl -sk -X POST "${MAILCOW_API_HOST}/api/v1/add/mailbox" \
  -H "X-API-Key: ${MAILCOW_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${payload}")

if echo "${response}" | jq -e 'type == "array" and (map(.type == "success") | all)' >/dev/null 2>&1; then
  echo "Created mailbox ${EMAIL}"
else
  echo "Failed to create ${EMAIL}: ${response}" >&2
  exit 1
fi
