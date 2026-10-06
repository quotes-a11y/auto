# Move Elevated Operations to Render

The standalone app and database can run entirely on Render. `render.yaml` defines the Node web service and a paid PostgreSQL database in Oregon. The web service uses the database's internal connection string and a `/health` healthcheck. External database access is blocked by default.

## Current blocker

The project does not yet have a GitHub, GitLab or Bitbucket remote. The connected tools can upload files to an existing GitHub repository, but cannot create a new repository. An empty private repository and its URL are needed before deployment can proceed. Do not use the separate e-commerce repository.

Render workspace discovered: My Workspace, associated with quotes@automaticdoorparts.info. Confirm this is the intended destination when supplying the repository.

## Concrete deployment configuration

- Web service: `elevated-operations`, Node 24.19.0, paid `0.5c-512mb` compute.
- Database: `elevated-operations-db`, PostgreSQL 18, paid `0.1c-256mb` compute, 5 GB storage.
- Build runs UI assembly, syntax/type checks and all automated tests.
- Startup applies/checks the schema and verifies real PostgreSQL transactions, numbering, totals and PDFs.
- Setup key is generated on Render. If existing accounts are migrated, setup remains disabled automatically.
- Sender secrets are optional; the application works before email is configured and records delivery failures explicitly.
- Paid resources are proposed to satisfy the original requirement against temporary/free production databases; resource creation and current cost review are pending.

## Migration sequence for the technical builder

1. Confirm the new private source repository and Render workspace.
2. Upload the modular source and Blueprint. Verify source revision and build.
3. Create the paid target database. Inspect the current Railway schema and record counts; do not assume it is still empty.
4. Preserve all customers, products, documents, user accounts, payments, sequence values, snapshots, settings and audit history. Exclude session tokens when moving to the new host, so users sign in again.
5. If business records exist, suspend writes briefly, create a verified PostgreSQL export, and restore into the blank target before first application startup. Do not overwrite the existing Railway database. Temporary migration access must be narrowed and removed afterward.
6. Deploy the web service using the Render internal database connection. The application recognizes `RENDER_EXTERNAL_URL` for request-origin validation; set APP_URL only for a future custom domain.
7. Check health, logs, schema and record counts; verify login, document/PDF generation, balances, payments, numbering and inventory. Confirm managed backup retention and perform an isolated restore drill.
8. Provide the new Render URL. Keep the old deployment available during verification; retire it only after the new app and data are verified and the user authorizes retirement.

No Render application/database resources have been created yet. No Railway records have been moved or deleted. Blueprint YAML parsing and database-reference checks passed; application syntax/type checks and all 12 automated tests passed. The Blueprint has not been validated by the Render API/CLI or deployed.
