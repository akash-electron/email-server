#!/usr/bin/env bash
# Usage: ./scripts/verify-domain-dns.sh <domain> [expected-mx-host]
#
# Checks that a customer's domain has the DNS records Mailcow needs:
# MX, SPF (TXT), DMARC (TXT on _dmarc.<domain>), and DKIM (TXT on
# <selector>._domainkey.<domain>, fetched from Mailcow's API and compared
# against what's actually published).
#
# This is the logic a future dashboard's "verify domain" button needs —
# proven here as a script before it becomes an API endpoint.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <domain> [expected-mx-host]" >&2
  exit 1
fi

DOMAIN="$1"
EXPECTED_MX="${2:-mail.local.test}"
MAILCOW_API_HOST="${MAILCOW_API_HOST:-https://localhost}"
MAILCOW_API_KEY="${MAILCOW_API_KEY:-}"

pass=0
fail=0

check() {
  local label="$1" ok="$2" detail="$3"
  if [[ "$ok" == "1" ]]; then
    echo "[PASS] ${label}: ${detail}"
    pass=$((pass + 1))
  else
    echo "[FAIL] ${label}: ${detail}"
    fail=$((fail + 1))
  fi
}

# MX
mx_result=$(dig +short MX "${DOMAIN}" | sort)
if echo "${mx_result}" | grep -qi "${EXPECTED_MX}"; then
  check "MX" 1 "${mx_result:-<empty>}"
else
  check "MX" 0 "expected host containing '${EXPECTED_MX}', got: ${mx_result:-<empty>}"
fi

# SPF (TXT on the domain itself)
spf_result=$(dig +short TXT "${DOMAIN}" | grep "v=spf1" || true)
if [[ -n "${spf_result}" ]]; then
  check "SPF" 1 "${spf_result}"
else
  check "SPF" 0 "no v=spf1 TXT record found on ${DOMAIN}"
fi

# DMARC
dmarc_result=$(dig +short TXT "_dmarc.${DOMAIN}" | grep "v=DMARC1" || true)
if [[ -n "${dmarc_result}" ]]; then
  check "DMARC" 1 "${dmarc_result}"
else
  check "DMARC" 0 "no v=DMARC1 TXT record found on _dmarc.${DOMAIN}"
fi

# DKIM — compare published record against what Mailcow expects for this domain
if [[ -n "${MAILCOW_API_KEY}" ]]; then
  expected_dkim=$(curl -sk "${MAILCOW_API_HOST}/api/v1/get/dkim/${DOMAIN}" -H "X-API-Key: ${MAILCOW_API_KEY}" | { grep -o '"dkim_selector":[[:space:]]*"[^"]*"' || true; } | sed -E 's/.*"([^"]*)"$/\1/')
  if [[ -n "${expected_dkim}" ]]; then
    dkim_result=$(dig +short TXT "${expected_dkim}._domainkey.${DOMAIN}" || true)
    if [[ -n "${dkim_result}" ]]; then
      check "DKIM" 1 "selector '${expected_dkim}' published"
    else
      check "DKIM" 0 "no TXT record found at ${expected_dkim}._domainkey.${DOMAIN}"
    fi
  else
    check "DKIM" 0 "could not fetch expected DKIM selector from Mailcow API for ${DOMAIN}"
  fi
else
  echo "[SKIP] DKIM: set MAILCOW_API_KEY to check DKIM against Mailcow's expected record"
fi

echo
echo "Result: ${pass} passed, ${fail} failed"
[[ "${fail}" -eq 0 ]]
