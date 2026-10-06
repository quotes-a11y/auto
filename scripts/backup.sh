#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL in the backup job environment}"
: "${BACKUP_DIR:?Set BACKUP_DIR to encrypted, durable backup storage}"
umask 077
mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/elevated-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file="$backup_file"
pg_restore --list "$backup_file" >/dev/null
printf '%s\n' "Backup completed and archive manifest verified."
