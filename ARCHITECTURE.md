# Architecture and database

The client uses an authenticated JSON API. Express validates all input and checks role permissions before a business operation. PostgreSQL owns relational persistence, constraints, sequential numbering, saved snapshots and transactions. PDF generation and email delivery are separate services. Browser storage is not authoritative.

## Relational entities

| Area | Tables | Purpose |
| --- | --- | --- |
| Identity | users, sessions | Hashed passwords, role policy, expiring hashed session tokens and CSRF tokens |
| CRM | customers, customer_contacts | Customer/contractor accounts; future multiple contacts |
| Purchasing | suppliers, product_suppliers | Supplier details, multiple sources, primary source, supplier SKU/cost/currency |
| Catalog | products, product_variants, product_addons | CAD base product data and future configurable offerings |
| Jobs | projects | Shared project links for all document types |
| Documents | documents, document_lines, document_sequences | Shared normalized document header and relational line tables; each document has an explicit type |
| Cash | payments | Invoice allocations, method, references, idempotency keys |
| Stock | inventory_movements | Signed, attributed receipts, opening balances, adjustments and shipments |
| Delivery | email_logs | Recipient, revision, provider result and failure reason |
| Governance | audit_logs, settings, schema_migrations | Append-only history, company/tax/template settings and database versions |
| Integrations | external_mappings | Unique internal-to-external mappings for future safe synchronization |

A common document header avoids duplicating identical fields across estimates, invoices, orders and POs. It does not combine customers, products, payments or inventory into a giant record. Line items are relational rows with independent snapshots.

## Critical workflows

Conversions lock the source and create the target, lines, number and audit entry in a single transaction. A repeated conversion returns the existing target. Supplier conversion groups lines by primary supplier and validates supplier currency and minimum quantity. Invalid sourcing rolls the operation back.

Payment recording locks the invoice, validates its issued status and remaining balance, inserts the payment and updates invoice status together. The same idempotency key cannot allocate twice.

PO receiving locks the PO, validates each receipt against remaining quantity, updates lines and stock and records movements and history together. Shipping aggregates quantities by product, locks product rows in a consistent order and rejects insufficient stock before committing any change.

The audit trigger rejects updates and deletes. Database operators with superuser credentials could still alter the database; append-only protection is against application mutations, not an external administrator. A restricted production database role, off-site audit exports and monitored backups are recommended hardening work.

## API boundary

All business routes require a signed-in session and are role checked. Mutations require JSON, matching CSRF token, and a permitted request origin. SQL values are parameterized. Monetary totals are recalculated on the server using integer-cent arithmetic. Request totals are discarded. Customer-facing PDFs contain selling prices and exclude private cost/margin fields.

Future website integrations should use separate scoped service credentials, idempotency keys, explicit account ownership and dedicated `/api/orders` integration endpoints. The current internal session API is not advertised as a public machine-to-machine integration.

## Reliability

Startup migration is serialized by a PostgreSQL advisory transaction lock. It verifies the schema version, required tables and total integrity. Startup verification exercises real PostgreSQL inserts, numbering, document calculations and four PDF formats, then rolls every verification record back. `/health` checks database connectivity without exposing business data. Errors return clean messages; diagnostic details are server-only.

Outstanding reliability work includes pagination beyond V1 caps, production database least privilege, scheduled backup verification, a restore drill, an email outbox with recovery of interrupted Pending attempts, and monitoring/alert routing.
