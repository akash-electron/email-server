#!/usr/bin/env bash
# Usage: ./scripts/add-mailbox.sh user@local.test password
#
# NOTE: the mail domain (e.g. local.test) must NOT match the server
# hostname set in docker-compose.yml (mail.local.test), or Postfix will
# bounce mail with "unknown user" — it needs mydestination and
# virtual_mailbox_domains to stay distinct.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <email> <password>" >&2
  exit 1
fi

docker exec -it mailserver setup email add "$1" "$2"
