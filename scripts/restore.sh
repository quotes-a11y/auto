#!/usr/bin/env bash
set -euo pipefail
: "${RESTORE_DATABASE_URL:?Set RESTORE_DATABASE_URL to a NEW isolated recovery database}"
: "${BACKUP_FILE:?Set BACKUP_FILE to the selected archive}"
# Never clean or overwrite an existing production database.
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner --no-acl --exit-on-error --single-transaction "$BACKUP_FILE"
printf '%s\n' "Restore complete. Run application integrity checks before directing traffic to this database."
