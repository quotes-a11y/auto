# Backup and recovery plan

The deployed PostgreSQL database has a persistent volume. A volume is not a backup. Automated schedules have not been configured in this build.

Before live business use:

1. Confirm an ongoing paid Railway plan and adequate database capacity; do not depend on temporary trial credits.
2. Enable daily, weekly and monthly backups for the Postgres volume from its Backups tab. Inspect the schedule and verify the first successful backup.
3. Run a nightly encrypted logical PostgreSQL export to independent durable storage. `scripts/backup.sh` creates a custom-format archive and validates its manifest. Scheduling, encryption, off-site transfer, retention and alerts must be configured by the deployment operator; the helper alone does not provide them.
4. Set retention targets: 7 daily, 4 weekly and 12 monthly independent logical exports. Use business policy to confirm retention and access.
5. Restore a backup into a new isolated recovery database using `scripts/restore.sh`. It deliberately has no destructive clean/drop option.
6. Run startup integrity checks and the core workflow suite against the recovery environment. Confirm document counts, highest numbers, payments, balances, snapshots, supplier receipts and audit history.
7. Record the restore time, backup age, checks and result. Repeat monthly and before a substantial schema migration.

Recovery target: no more than 24 hours of data loss and restoration within 4 hours, subject to a measured restore drill. These are targets, not verified guarantees.

During an incident, suspend writes, choose the last verified recovery point, restore to an isolated database, validate balances and document numbers, then switch the application's connection in a controlled cutover. Retain the original database for investigation. Never run a destructive restore over the only production copy.

Provider references checked during the build:
- https://docs.railway.com/volumes/backups
- https://docs.railway.com/volumes/reference

Email/PDF attachments are regenerated from document snapshots. Future uploaded files require independent object-storage backup; none are accepted in V1.
