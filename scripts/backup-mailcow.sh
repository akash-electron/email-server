#!/usr/bin/env bash
# Usage: [BACKUP_DIR=/var/backups/mailcow] [KEEP_DAYS=7] [RSYNC_TARGET=user@host:/path/] \
#          ./scripts/backup-mailcow.sh
#
# Full Mailcow backup (mail, database, redis, rspamd, postfix) using Mailcow's
# own helper-scripts/backup_and_restore.sh, then prunes backups older than
# KEEP_DAYS. If RSYNC_TARGET is set, the new backup is also copied offsite.
#
# Cron (daily 03:00, run as a user that can use docker):
#   0 3 * * * /root/email-server/scripts/backup-mailcow.sh >> /var/log/mailcow-backup.log 2>&1
#
# Restore: MAILCOW_BACKUP_LOCATION=<dir> mailcow-dockerized/helper-scripts/backup_and_restore.sh restore
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAILCOW_DIR="${REPO_DIR}/mailcow-dockerized"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mailcow}"
KEEP_DAYS="${KEEP_DAYS:-7}"
RSYNC_TARGET="${RSYNC_TARGET:-}"

[[ -d "${MAILCOW_DIR}" ]] || { echo "mailcow-dockerized not found at ${MAILCOW_DIR}" >&2; exit 1; }
[[ "${KEEP_DAYS}" =~ ^[0-9]+$ ]] || { echo "KEEP_DAYS must be a number" >&2; exit 1; }

mkdir -p "${BACKUP_DIR}"
# Mailcow's backup refuses dirs whose "others" bits are not 5-7 (container user).
chmod 755 "${BACKUP_DIR}"

echo "==> $(date '+%F %T') starting Mailcow backup into ${BACKUP_DIR}"
MAILCOW_BACKUP_LOCATION="${BACKUP_DIR}" THREADS="${THREADS:-2}" \
  "${MAILCOW_DIR}/helper-scripts/backup_and_restore.sh" backup all --delete-days "${KEEP_DAYS}"

if [[ -n "${RSYNC_TARGET}" ]]; then
  echo "==> Copying offsite to ${RSYNC_TARGET}"
  rsync -a --delete "${BACKUP_DIR}/" "${RSYNC_TARGET}"
fi

echo "==> $(date '+%F %T') backup finished"
du -sh "${BACKUP_DIR}"
