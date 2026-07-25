#!/usr/bin/env bash
# Usage: ./scripts/deploy-vps.sh <mail-hostname>
# Example: ./scripts/deploy-vps.sh mail-engine.domain.com
#
# Run this ON THE VPS (Ubuntu, Docker + Docker Compose already installed).
# Clones mailcow-dockerized fresh and writes mailcow.conf directly (skips
# the interactive/flaky generate_config.sh entirely — it has known issues
# even on Linux with unattended piping, see server-progress.md).
#
# Auto-detects if ports 80/443 are already taken (e.g. by an existing nginx
# serving other apps on this box) and if so, binds Mailcow's web UI to
# 127.0.0.1:8082/8443 instead and disables Mailcow's own Let's Encrypt --
# you then front it with your existing reverse proxy + certbot. Prints
# exactly what to do either way at the end.
#
# Before running: add DNS records —
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

rand() { openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

port_busy() {
  ss -tuln 2>/dev/null | grep -q ":$1[[:space:]]"
}

if [[ ! -d "${MAILCOW_DIR}" ]]; then
  echo "==> Cloning mailcow-dockerized"
  git clone --depth 1 https://github.com/mailcow/mailcow-dockerized.git "${MAILCOW_DIR}"
else
  echo "==> mailcow-dockerized already present, pulling latest"
  git -C "${MAILCOW_DIR}" pull
fi

cd "${MAILCOW_DIR}"

if [[ -f mailcow.conf ]]; then
  echo "==> mailcow.conf already exists, leaving it as-is (delete it first to regenerate)"
else
  BEHIND_PROXY=n
  HTTP_PORT_VAL=80
  HTTPS_PORT_VAL=443
  HTTP_BIND_VAL=
  HTTPS_BIND_VAL=
  SKIP_LE=n

  if port_busy 80 || port_busy 443; then
    echo "==> Ports 80/443 are already in use on this host (existing web server detected)."
    echo "    Binding Mailcow's web UI to 127.0.0.1:8082/8443 instead, and disabling its"
    echo "    own Let's Encrypt -- front it with your existing reverse proxy + certbot."
    BEHIND_PROXY=y
    HTTP_PORT_VAL=8082
    HTTPS_PORT_VAL=8443
    HTTP_BIND_VAL=127.0.0.1
    HTTPS_BIND_VAL=127.0.0.1
    SKIP_LE=y
  fi

  echo "==> Writing mailcow.conf for hostname ${HOSTNAME_ARG}"
  cat > mailcow.conf <<EOF
MAILCOW_HOSTNAME=${HOSTNAME_ARG}
MAILCOW_PASS_SCHEME=BLF-CRYPT

DBNAME=mailcow
DBUSER=mailcow
DBPASS=$(rand 28)
DBROOT=$(rand 28)

REDISPASS=$(rand 28)

HTTP_PORT=${HTTP_PORT_VAL}
HTTP_BIND=${HTTP_BIND_VAL}
HTTPS_PORT=${HTTPS_PORT_VAL}
HTTPS_BIND=${HTTPS_BIND_VAL}
HTTP_REDIRECT=$([ "${BEHIND_PROXY}" = "y" ] && echo n || echo y)

SMTP_PORT=25
SMTPS_PORT=465
SUBMISSION_PORT=587
IMAP_PORT=143
IMAPS_PORT=993
POP_PORT=110
POPS_PORT=995
SIEVE_PORT=4190
DOVEADM_PORT=127.0.0.1:19991
SQL_PORT=127.0.0.1:13306
REDIS_PORT=127.0.0.1:7654

TZ=Asia/Kolkata
COMPOSE_PROJECT_NAME=mailcowdockerized
DOCKER_COMPOSE_VERSION=

ACL_ANYONE=disallow
MAILDIR_GC_TIME=7200
ADDITIONAL_SAN=
AUTODISCOVER_SAN=y
ADDITIONAL_SERVER_NAMES=

SKIP_LETS_ENCRYPT=${SKIP_LE}
ACME_DNS_CHALLENGE=n
ACME_DNS_PROVIDER=dns_xxx
ACME_ACCOUNT_EMAIL=me@example.com

ENABLE_SSL_SNI=n
SKIP_IP_CHECK=n
SKIP_HTTP_VERIFICATION=n
SKIP_UNBOUND_HEALTHCHECK=n
SKIP_CLAMD=n
SKIP_OLEFY=n
SKIP_SOGO=n
SKIP_FTS=n
FTS_HEAP=128
FTS_PROCS=1

ALLOW_ADMIN_EMAIL_LOGIN=n
USE_WATCHDOG=y
WATCHDOG_NOTIFY_BAN=n
WATCHDOG_NOTIFY_START=y
WATCHDOG_EXTERNAL_CHECKS=n
WATCHDOG_VERBOSE=n
LOG_LINES=9999

IPV4_NETWORK=172.22.1
IPV6_NETWORK=fd4d:6169:6c63:6f77::/64

MAILDIR_SUB=Maildir
SOGO_EXPIRE_SESSION=480
SOGO_URL_ENCRYPTION_KEY=$(rand 16)

DOVECOT_MASTER_USER=
DOVECOT_MASTER_PASS=

WEBAUTHN_ONLY_TRUSTED_VENDORS=n
SPAMHAUS_DQS_KEY=

ENABLE_IPV6=false
DISABLE_NETFILTER_ISOLATION_RULE=n
EOF

  echo "BEHIND_PROXY=${BEHIND_PROXY}" > .deploy-vps-state
fi

# Defensive: self-signed cert assets used as a fallback by some components
# even when SKIP_LETS_ENCRYPT=y; make sure they exist.
mkdir -p data/assets/ssl
if [[ ! -f data/assets/ssl/dhparams.pem ]]; then
  echo "==> Generating self-signed ssl assets"
  mkdir -p data/assets/ssl-example
  openssl req -x509 -newkey rsa:4096 -keyout data/assets/ssl-example/key.pem \
    -out data/assets/ssl-example/cert.pem -days 365 \
    -subj "/CN=${HOSTNAME_ARG}" -sha256 -nodes
  openssl dhparam -out data/assets/ssl-example/dhparams.pem 2048
  cp data/assets/ssl-example/*.pem data/assets/ssl/
fi

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

BEHIND_PROXY_FINAL=n
[[ -f .deploy-vps-state ]] && source .deploy-vps-state && BEHIND_PROXY_FINAL="${BEHIND_PROXY}"

cat <<EOF

Next steps:
1. Confirm all containers above are Up (clamd/unbound should show healthy).
EOF

if [[ "${BEHIND_PROXY_FINAL}" = "y" ]]; then
  cat <<EOF
2. Mailcow's web UI is on 127.0.0.1:8082 (HTTP) / 127.0.0.1:8443 (HTTPS),
   NOT exposed publicly. Add a server block to your existing nginx for
   ${HOSTNAME_ARG} that gets a real cert via certbot and proxies to
   http://127.0.0.1:8082 -- ask for the exact nginx config if needed.
EOF
else
  cat <<EOF
2. Log into https://${HOSTNAME_ARG} (default admin/moohoo -- change immediately),
   or use the API directly -- see FLOW.md for verified add/domain, add/mailbox,
   get/dkim calls.
EOF
fi

cat <<EOF
3. Once your mail domain is added, fetch its DKIM record and add it as a DNS
   TXT record, then run:
     ./scripts/verify-domain-dns.sh <your-domain> ${HOSTNAME_ARG}
   to confirm MX/SPF/DMARC/DKIM all resolve correctly.
EOF
