#!/usr/bin/env bash
# Usage: ./scripts/deploy-vps.sh <mail-hostname>
# Example: ./scripts/deploy-vps.sh mail-engine.domain.com
#
# Run this ON THE VPS (Ubuntu, Docker + Docker Compose already installed).
# Clones/updates mailcow-dockerized fresh, configures it for the given
# hostname, and starts the stack. Real Let's Encrypt certs are left enabled
# (unlike the local dev setup) since a real VPS has real DNS behind it.
#
# Before running: add DNS records first —
#   A record:  <mail-hostname>        -> this VPS's public IP
#   MX record: <your-mail-domain>     -> <mail-hostname>, priority 10
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <mail-hostname>   e.g. $0 mail-engine.domain.com" >&2
  exit 1
fi

HOSTNAME_ARG="$1"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAILCOW_DIR="${REPO_DIR}/mailcow-dockerized"

if [[ ! -d "${MAILCOW_DIR}" ]]; then
  echo "==> Cloning mailcow-dockerized"
  git clone --depth 1 https://github.com/mailcow/mailcow-dockerized.git "${MAILCOW_DIR}"
else
  echo "==> mailcow-dockerized already present, pulling latest"
  git -C "${MAILCOW_DIR}" pull
fi

cd "${MAILCOW_DIR}"

if [[ ! -f mailcow.conf ]]; then
  echo "==> Generating mailcow.conf for hostname ${HOSTNAME_ARG}"
  echo "${HOSTNAME_ARG}" | ./generate_config.sh
else
  echo "==> mailcow.conf already exists, leaving it as-is (delete it first to regenerate)"
fi

# Defensive: on some environments generate_config.sh's cert copy step can
# silently fail (seen locally on macOS with `cp -d`). Make sure the real
# ssl assets are in place; harmless no-op if they already are.
if [[ ! -f data/assets/ssl/dhparams.pem ]] && [[ -f data/assets/ssl-example/dhparams.pem ]]; then
  echo "==> Copying missing ssl assets from ssl-example/"
  cp data/assets/ssl-example/*.pem data/assets/ssl/
fi

# Real domain + real DNS behind this, so let Mailcow get a real cert
# (opposite of local dev, where this is disabled).
sed -i.bak 's/^SKIP_LETS_ENCRYPT=.*/SKIP_LETS_ENCRYPT=n/' mailcow.conf

echo "==> Pulling images (this takes a while the first time)"
docker compose pull

echo "==> Starting stack"
docker compose up -d

echo
echo "==> Waiting for core containers to report healthy..."
for i in $(seq 1 30); do
  unhealthy=$(docker compose ps --format json | grep -c '"Health":"starting"' || true)
  [[ "${unhealthy}" -eq 0 ]] && break
  sleep 5
done
docker compose ps

cat <<EOF

Next steps:
1. Confirm all containers above are Up (clamd/unbound should show healthy).
2. Log into https://${HOSTNAME_ARG} (default admin/moohoo — change immediately),
   or use the API directly — see FLOW.md for verified add/domain, add/mailbox,
   get/dkim calls.
3. Once your mail domain is added, fetch its DKIM record and add it as a DNS
   TXT record, then run:
     ./scripts/verify-domain-dns.sh <your-domain> ${HOSTNAME_ARG}
   to confirm MX/SPF/DMARC/DKIM all resolve correctly.
EOF
